package com.qawi.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qawi.dto.FoodEntryRequest;
import com.qawi.dto.NutritionTargetRequest;
import com.qawi.dto.WaterLogRequest;
import com.qawi.entity.*;
import com.qawi.exception.AppException;
import com.qawi.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NutritionV3Service {

    private final UserRepository userRepository;
    private final NutritionTargetRepository nutritionTargetRepository;
    private final FoodEntryRepository foodEntryRepository;
    private final WaterLogRepository waterLogRepository;
    private final CoachMemberRepository coachMemberRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${OPENAI_API_KEY:}")
    private String openAiKey;

    private User loadUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));
    }

    @Transactional
    public Map<String, Object> setTarget(String coachEmail, NutritionTargetRequest req) {
        User coach = loadUser(coachEmail);
        if (coach.getRole() != Role.COACH && coach.getRole() != Role.GYM_ADMIN)
            throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);

        User member = userRepository.findById(req.getMemberId())
                .orElseThrow(() -> new AppException("Member not found", "العضو غير موجود", HttpStatus.NOT_FOUND));
        if (!coach.getGymId().equals(member.getGymId()))
            throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);

        NutritionTarget target = nutritionTargetRepository.findByMemberId(req.getMemberId())
                .orElse(NutritionTarget.builder().memberId(req.getMemberId()).build());
        target.setCoachId(coach.getId());
        target.setCalories(req.getCalories());
        target.setProteinG(req.getProteinG());
        target.setCarbsG(req.getCarbsG());
        target.setFatG(req.getFatG());
        target.setWaterMl(req.getWaterMl());
        target.setGoal(req.getGoal());
        target.setUpdatedAt(LocalDateTime.now());
        target = nutritionTargetRepository.save(target);
        return buildTargetMap(target);
    }

    public Map<String, Object> getTarget(String callerEmail, UUID memberId) {
        User caller = loadUser(callerEmail);
        User member = userRepository.findById(memberId)
                .orElseThrow(() -> new AppException("Member not found", "العضو غير موجود", HttpStatus.NOT_FOUND));

        if (caller.getRole() == Role.MEMBER && !caller.getId().equals(memberId))
            throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);
        if (caller.getRole() == Role.COACH && !caller.getGymId().equals(member.getGymId()))
            throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);

        Optional<NutritionTarget> target = nutritionTargetRepository.findByMemberId(memberId);
        if (target.isEmpty()) {
            Map<String, Object> empty = new LinkedHashMap<>();
            empty.put("hasTarget", false);
            return empty;
        }
        Map<String, Object> result = buildTargetMap(target.get());
        result.put("hasTarget", true);
        return result;
    }

    public Map<String, Object> analyzeFood(String input) {
        if (openAiKey != null && !openAiKey.isBlank()) {
            try {
                return callOpenAI(input);
            } catch (Exception e) {
                log.warn("OpenAI call failed, using fallback: {}", e.getMessage());
            }
        }
        return estimateNutrition(input);
    }

    @Transactional
    public Map<String, Object> logFood(String callerEmail, FoodEntryRequest req) {
        User caller = loadUser(callerEmail);
        UUID memberId = req.getMemberId();

        if (caller.getRole() == Role.MEMBER && !caller.getId().equals(memberId))
            throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);

        Map<String, Object> analysis = null;
        if (req.getCalories() == null) {
            analysis = analyzeFood(req.getRawInput());
        }

        FoodEntry entry = FoodEntry.builder()
                .memberId(memberId)
                .rawInput(req.getRawInput())
                .foodName(req.getFoodName() != null ? req.getFoodName()
                        : (analysis != null ? (String) analysis.get("foodName") : req.getRawInput()))
                .foodNameAr(req.getFoodNameAr() != null ? req.getFoodNameAr()
                        : (analysis != null ? (String) analysis.get("foodNameAr") : null))
                .mealType(req.getMealType())
                .quantity(req.getQuantity())
                .unit(req.getUnit())
                .calories(req.getCalories() != null ? req.getCalories()
                        : (analysis != null ? getDouble(analysis, "calories") : 0.0))
                .proteinG(req.getProteinG() != null ? req.getProteinG()
                        : (analysis != null ? getDouble(analysis, "protein") : 0.0))
                .carbsG(req.getCarbsG() != null ? req.getCarbsG()
                        : (analysis != null ? getDouble(analysis, "carbs") : 0.0))
                .fatG(req.getFatG() != null ? req.getFatG()
                        : (analysis != null ? getDouble(analysis, "fat") : 0.0))
                .fiberG(req.getFiberG() != null ? req.getFiberG()
                        : (analysis != null ? getDouble(analysis, "fiber") : 0.0))
                .sugarG(req.getSugarG() != null ? req.getSugarG()
                        : (analysis != null ? getDouble(analysis, "sugar") : 0.0))
                .confidence(req.getConfidence() != null ? req.getConfidence()
                        : (analysis != null ? getDouble(analysis, "confidence") : 0.7))
                .source(req.getSource() != null ? req.getSource() : "AI")
                .build();

        entry = foodEntryRepository.save(entry);
        return buildEntryMap(entry);
    }

    public Map<String, Object> getTodayLog(String callerEmail, UUID memberId) {
        User caller = loadUser(callerEmail);
        if (caller.getRole() == Role.MEMBER && !caller.getId().equals(memberId))
            throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);

        LocalDateTime start = LocalDate.now().atStartOfDay();
        LocalDateTime end = start.plusDays(1);

        List<FoodEntry> entries = foodEntryRepository.findTodayEntries(memberId, start, end);
        int waterMl = waterLogRepository.sumTodayWater(memberId, start, end);
        List<WaterLog> waterLogs = waterLogRepository.findTodayLogs(memberId, start, end);

        Map<String, Object> totals = calcTotals(entries);
        Optional<NutritionTarget> target = nutritionTargetRepository.findByMemberId(memberId);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("entries", entries.stream().map(this::buildEntryMap).collect(Collectors.toList()));
        result.put("totals", totals);
        result.put("waterMl", waterMl);
        result.put("waterLogs", waterLogs.stream().map(w -> {
            Map<String, Object> wm = new LinkedHashMap<>();
            wm.put("id", w.getId());
            wm.put("amountMl", w.getAmountMl());
            wm.put("loggedAt", w.getLoggedAt());
            return wm;
        }).collect(Collectors.toList()));

        if (target.isPresent()) {
            result.put("target", buildTargetMap(target.get()));
            result.put("hasTarget", true);
        } else {
            result.put("hasTarget", false);
        }
        return result;
    }

    public List<Map<String, Object>> getHistory(String callerEmail, UUID memberId) {
        User caller = loadUser(callerEmail);
        if (caller.getRole() == Role.MEMBER && !caller.getId().equals(memberId))
            throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);

        return foodEntryRepository.findByMemberIdOrderByLoggedAtDesc(memberId)
                .stream().map(this::buildEntryMap).collect(Collectors.toList());
    }

    @Transactional
    public void deleteEntry(String callerEmail, UUID entryId) {
        User caller = loadUser(callerEmail);
        FoodEntry entry = foodEntryRepository.findById(entryId)
                .orElseThrow(() -> new AppException("Entry not found", "السجل غير موجود", HttpStatus.NOT_FOUND));
        if (caller.getRole() == Role.MEMBER && !caller.getId().equals(entry.getMemberId()))
            throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);
        if (caller.getRole() == Role.COACH)
            throw new AppException("Coaches cannot delete member food logs", "المدرب لا يستطيع حذف سجلات الطعام", HttpStatus.FORBIDDEN);
        foodEntryRepository.delete(entry);
    }

    @Transactional
    public Map<String, Object> logWater(String callerEmail, WaterLogRequest req) {
        User caller = loadUser(callerEmail);
        if (caller.getRole() == Role.MEMBER && !caller.getId().equals(req.getMemberId()))
            throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);

        WaterLog log = waterLogRepository.save(WaterLog.builder()
                .memberId(req.getMemberId())
                .amountMl(req.getAmountMl())
                .build());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", log.getId());
        result.put("amountMl", log.getAmountMl());
        result.put("loggedAt", log.getLoggedAt());
        result.put("totalTodayMl", waterLogRepository.sumTodayWater(req.getMemberId(),
                LocalDate.now().atStartOfDay(), LocalDate.now().atStartOfDay().plusDays(1)));
        return result;
    }

    public Map<String, Object> getCoachOverview(String coachEmail, UUID memberId) {
        User coach = loadUser(coachEmail);
        if (coach.getRole() != Role.COACH && coach.getRole() != Role.GYM_ADMIN)
            throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);

        User member = userRepository.findById(memberId)
                .orElseThrow(() -> new AppException("Member not found", "العضو غير موجود", HttpStatus.NOT_FOUND));
        if (!coach.getGymId().equals(member.getGymId()))
            throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);

        Map<String, Object> result = getTodayLog(coachEmail, memberId);

        LocalDateTime weekAgo = LocalDateTime.now().minusDays(7);
        List<FoodEntry> weekEntries = foodEntryRepository.findByMemberIdAndDateRange(
                memberId, weekAgo, LocalDateTime.now());

        double weeklyAdherence = 0;
        Optional<NutritionTarget> target = nutritionTargetRepository.findByMemberId(memberId);
        if (target.isPresent() && target.get().getCalories() != null && target.get().getCalories() > 0) {
            Map<LocalDate, List<FoodEntry>> byDay = weekEntries.stream()
                    .collect(Collectors.groupingBy(e -> e.getLoggedAt().toLocalDate()));
            long daysOnTarget = byDay.values().stream()
                    .filter(dayEntries -> {
                        double total = dayEntries.stream().mapToDouble(e -> e.getCalories() != null ? e.getCalories() : 0).sum();
                        double tgt = target.get().getCalories();
                        return total >= tgt * 0.8 && total <= tgt * 1.2;
                    }).count();
            weeklyAdherence = byDay.isEmpty() ? 0 : (double) daysOnTarget / 7 * 100;
        }

        double avgCalories = weekEntries.stream()
                .mapToDouble(e -> e.getCalories() != null ? e.getCalories() : 0).average().orElse(0);
        double avgProtein = weekEntries.stream()
                .mapToDouble(e -> e.getProteinG() != null ? e.getProteinG() : 0).average().orElse(0);

        result.put("weeklyAdherence", Math.round(weeklyAdherence * 10.0) / 10.0);
        result.put("avgCalories7d", Math.round(avgCalories * 10.0) / 10.0);
        result.put("avgProtein7d", Math.round(avgProtein * 10.0) / 10.0);
        result.put("memberName", member.getName());
        return result;
    }

    private Map<String, Object> callOpenAI(String input) throws Exception {
        String prompt = "Analyze this food item and return ONLY a JSON object with these exact fields: " +
                "foodName (string, English), foodNameAr (string, Arabic), calories (number per serving), " +
                "protein (number grams), carbs (number grams), fat (number grams), fiber (number grams), " +
                "sugar (number grams), confidence (0 to 1). " +
                "Food: " + input;

        String requestBody = objectMapper.writeValueAsString(Map.of(
                "model", "gpt-4o-mini",
                "messages", List.of(Map.of("role", "user", "content", prompt)),
                "response_format", Map.of("type", "json_object"),
                "max_tokens", 300
        ));

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.openai.com/v1/chat/completions"))
                .header("Authorization", "Bearer " + openAiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        JsonNode root = objectMapper.readTree(response.body());
        String content = root.path("choices").get(0).path("message").path("content").asText();
        JsonNode data = objectMapper.readTree(content);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("foodName", data.path("foodName").asText(input));
        result.put("foodNameAr", data.path("foodNameAr").asText(input));
        result.put("calories", data.path("calories").asDouble(0));
        result.put("protein", data.path("protein").asDouble(0));
        result.put("carbs", data.path("carbs").asDouble(0));
        result.put("fat", data.path("fat").asDouble(0));
        result.put("fiber", data.path("fiber").asDouble(0));
        result.put("sugar", data.path("sugar").asDouble(0));
        result.put("confidence", data.path("confidence").asDouble(0.9));
        return result;
    }

    private Map<String, Object> estimateNutrition(String input) {
        String lower = input.toLowerCase();
        double calories = 300, protein = 20, carbs = 30, fat = 10;
        String name = input;
        String nameAr = input;

        if (lower.contains("شاورما") || lower.contains("shawarma")) {
            calories = 550; protein = 35; carbs = 45; fat = 18; name = "Chicken Shawarma"; nameAr = "شاورما دجاج";
        } else if (lower.contains("egg") || lower.contains("بيضة") || lower.contains("بيض")) {
            calories = 155; protein = 13; carbs = 1; fat = 11; name = "Egg"; nameAr = "بيضة";
        } else if (lower.contains("rice") || lower.contains("أرز")) {
            calories = 130; protein = 3; carbs = 28; fat = 0.3; name = "Cooked Rice"; nameAr = "أرز مطبوخ";
        } else if (lower.contains("chicken") || lower.contains("دجاج")) {
            calories = 239; protein = 27; carbs = 0; fat = 14; name = "Grilled Chicken"; nameAr = "دجاج مشوي";
        } else if (lower.contains("mansaf") || lower.contains("منسف")) {
            calories = 650; protein = 40; carbs = 60; fat = 25; name = "Mansaf"; nameAr = "منسف";
        } else if (lower.contains("falafel") || lower.contains("فلافل")) {
            calories = 333; protein = 13; carbs = 32; fat = 18; name = "Falafel"; nameAr = "فلافل";
        } else if (lower.contains("hummus") || lower.contains("حمص")) {
            calories = 177; protein = 8; carbs = 20; fat = 8; name = "Hummus"; nameAr = "حمص";
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("foodName", name);
        result.put("foodNameAr", nameAr);
        result.put("calories", calories);
        result.put("protein", protein);
        result.put("carbs", carbs);
        result.put("fat", fat);
        result.put("fiber", 2.0);
        result.put("sugar", 2.0);
        result.put("confidence", 0.6);
        return result;
    }

    private Map<String, Object> calcTotals(List<FoodEntry> entries) {
        double calories = entries.stream().mapToDouble(e -> e.getCalories() != null ? e.getCalories() : 0).sum();
        double protein = entries.stream().mapToDouble(e -> e.getProteinG() != null ? e.getProteinG() : 0).sum();
        double carbs = entries.stream().mapToDouble(e -> e.getCarbsG() != null ? e.getCarbsG() : 0).sum();
        double fat = entries.stream().mapToDouble(e -> e.getFatG() != null ? e.getFatG() : 0).sum();
        Map<String, Object> t = new LinkedHashMap<>();
        t.put("calories", Math.round(calories * 10.0) / 10.0);
        t.put("protein", Math.round(protein * 10.0) / 10.0);
        t.put("carbs", Math.round(carbs * 10.0) / 10.0);
        t.put("fat", Math.round(fat * 10.0) / 10.0);
        return t;
    }

    private Map<String, Object> buildTargetMap(NutritionTarget t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", t.getId());
        m.put("memberId", t.getMemberId());
        m.put("coachId", t.getCoachId());
        m.put("calories", t.getCalories());
        m.put("proteinG", t.getProteinG());
        m.put("carbsG", t.getCarbsG());
        m.put("fatG", t.getFatG());
        m.put("waterMl", t.getWaterMl());
        m.put("goal", t.getGoal());
        m.put("updatedAt", t.getUpdatedAt());
        return m;
    }

    private Map<String, Object> buildEntryMap(FoodEntry e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", e.getId());
        m.put("memberId", e.getMemberId());
        m.put("foodName", e.getFoodName());
        m.put("foodNameAr", e.getFoodNameAr());
        m.put("rawInput", e.getRawInput());
        m.put("mealType", e.getMealType());
        m.put("quantity", e.getQuantity());
        m.put("unit", e.getUnit());
        m.put("calories", e.getCalories());
        m.put("proteinG", e.getProteinG());
        m.put("carbsG", e.getCarbsG());
        m.put("fatG", e.getFatG());
        m.put("fiberG", e.getFiberG());
        m.put("sugarG", e.getSugarG());
        m.put("confidence", e.getConfidence());
        m.put("source", e.getSource());
        m.put("loggedAt", e.getLoggedAt());
        return m;
    }

    private Double getDouble(Map<String, Object> map, String key) {
        Object v = map.get(key);
        if (v == null) return 0.0;
        return ((Number) v).doubleValue();
    }
}
