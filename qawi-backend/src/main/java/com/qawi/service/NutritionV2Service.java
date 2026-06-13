package com.qawi.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qawi.dto.*;
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
public class NutritionV2Service {

    private final UserRepository userRepository;
    private final GymRepository gymRepository;
    private final NutritionTargetRepository nutritionTargetRepository;
    private final FoodEntryRepository foodEntryRepository;
    private final WaterLogRepository waterLogRepository;
    private final ArabicFoodCacheRepository foodCacheRepository;
    private final MealSuggestionRepository mealSuggestionRepository;
    private final AiNutritionLogRepository aiNutritionLogRepository;
    private final CoachMemberRepository coachMemberRepository;
    private final NutritionCalendarPlanRepository nutritionCalendarPlanRepository;
    private final NutritionPlanDayRepository nutritionPlanDayRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${OPENAI_API_KEY:}")
    private String openAiKey;

    @Value("${OPENAI_NUTRITION_MODEL:gpt-4o-mini}")
    private String nutritionModel;

    private static final int AI_DAILY_LIMIT = 100;

    // ─────────────────────────────────────────────────────────
    // TARGETS
    // ─────────────────────────────────────────────────────────

    @Transactional
    public Map<String, Object> setTarget(String callerEmail, NutritionTargetSetRequest req) {
        User caller = loadUser(callerEmail);
        User member = loadMemberById(req.getMemberId());
        assertSameGym(caller, member);
        assertCanManageTarget(caller, member);

        NutritionTarget target = nutritionTargetRepository.findByMemberId(req.getMemberId())
                .orElse(NutritionTarget.builder()
                        .memberId(req.getMemberId())
                        .gymId(member.getGymId())
                        .build());

        target.setGymId(member.getGymId());
        target.setCreatedByUserId(caller.getId());
        target.setCreatedByRole(caller.getRole().name());
        target.setCalories(req.getTargetCalories());
        target.setProteinG(req.getTargetProtein());
        target.setCarbsG(req.getTargetCarbs());
        target.setFatG(req.getTargetFat());
        if (req.getTargetWater() != null)
            target.setWaterMl((int) (req.getTargetWater() * 1000));
        target.setGoal(req.getGoal());
        target.setNotes(req.getNotes());
        target.setIsActive(true);
        target.setUpdatedAt(LocalDateTime.now());
        target = nutritionTargetRepository.save(target);
        return buildTargetMap(target);
    }

    public Map<String, Object> getTarget(String callerEmail, UUID memberId) {
        User caller = loadUser(callerEmail);
        User member = loadMemberById(memberId);
        assertCanViewMember(caller, member);
        Optional<NutritionTarget> t = nutritionTargetRepository.findByMemberId(memberId);
        if (t.isEmpty()) return Map.of("hasTarget", false);
        Map<String, Object> m = buildTargetMap(t.get());
        m.put("hasTarget", true);
        return m;
    }

    // ─────────────────────────────────────────────────────────
    // FOOD SEARCH (cache only — no AI on keystroke)
    // ─────────────────────────────────────────────────────────

    public List<Map<String, Object>> searchFood(String q) {
        if (q == null || q.isBlank()) return List.of();
        String trimmed = q.trim();
        String normalized = normalizeArabic(trimmed);
        // Search with original, then normalized if different — deduplicate by id
        List<ArabicFoodCache> hits = new ArrayList<>(foodCacheRepository.search(trimmed));
        if (!normalized.equals(trimmed)) {
            List<ArabicFoodCache> extra = foodCacheRepository.search(normalized);
            Set<UUID> seen = hits.stream().map(ArabicFoodCache::getId).collect(Collectors.toSet());
            for (ArabicFoodCache f : extra) if (seen.add(f.getId())) hits.add(f);
        }
        return hits.stream().limit(10).map(this::buildCacheItemMap).collect(Collectors.toList());
    }

    /**
     * Normalize Arabic text for fuzzy search:
     * - strip diacritics (tashkeel) U+064B–U+065F, U+0670
     * - normalize أ إ آ → ا
     * - normalize ة → ه
     * - normalize ى → ي
     */
    private String normalizeArabic(String input) {
        if (input == null) return "";
        return input
                .replaceAll("[\\u064B-\\u065F\\u0670]", "")
                .replace('\u0623', '\u0627').replace('\u0625', '\u0627').replace('\u0622', '\u0627')
                .replace('\u0629', '\u0647')
                .replace('\u0649', '\u064A');
    }

    // ─────────────────────────────────────────────────────────
    // CALCULATE (cache-first, AI fallback — no entry saved)
    // ─────────────────────────────────────────────────────────

    public Map<String, Object> calculateFood(String callerEmail, FoodCalculateRequest req) {
        User caller = loadUser(callerEmail);
        return resolveFood(req.getFoodName(), req.getQuantity(), req.getUnit(), caller);
    }

    // ─────────────────────────────────────────────────────────
    // LOG FOOD (cache-first, AI fallback — saves entry)
    // ─────────────────────────────────────────────────────────

    @Transactional
    public Map<String, Object> logFood(String callerEmail, FoodLogRequest req) {
        User caller = loadUser(callerEmail);
        UUID memberId = resolveMemberId(caller, req.getMemberId());
        User member = loadMemberById(memberId);
        assertCanViewMember(caller, member);
        assertWorkflowAllowsWrite(caller);

        Map<String, Object> nutrition = resolveFood(req.getFoodName(), req.getQuantity(), req.getUnit(), caller);
        LocalDateTime loggedAt = req.getLoggedAt() != null ? req.getLoggedAt() : LocalDateTime.now();

        FoodEntry entry = FoodEntry.builder()
                .memberId(memberId)
                .gymId(member.getGymId())
                .logDate(loggedAt.toLocalDate())
                .foodName((String) nutrition.get("foodName"))
                .foodNameAr((String) nutrition.getOrDefault("foodNameAr", ""))
                .quantity(req.getQuantity())
                .unit(req.getUnit())
                .mealType(req.getMealType())
                .calories(getD(nutrition, "calories"))
                .proteinG(getD(nutrition, "protein"))
                .carbsG(getD(nutrition, "carbs"))
                .fatG(getD(nutrition, "fat"))
                .fiberG(getD(nutrition, "fiber"))
                .sugarG(getD(nutrition, "sugar"))
                .sodium(getD(nutrition, "sodium"))
                .confidence(getD(nutrition, "confidence"))
                .source((String) nutrition.getOrDefault("source", "AI_CALCULATED"))
                .rawInput(req.getFoodName())
                .loggedAt(loggedAt)
                .build();
        entry = foodEntryRepository.save(entry);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("entry", buildEntryMap(entry));
        result.put("dailySummary", buildDailySummary(memberId, loggedAt.toLocalDate()));
        return result;
    }

    // ─────────────────────────────────────────────────────────
    // LOG FOOD MANUAL
    // ─────────────────────────────────────────────────────────

    @Transactional
    public Map<String, Object> logFoodManual(String callerEmail, FoodLogManualRequest req) {
        User caller = loadUser(callerEmail);
        UUID memberId = resolveMemberId(caller, req.getMemberId());
        User member = loadMemberById(memberId);
        assertCanViewMember(caller, member);
        assertWorkflowAllowsWrite(caller);

        LocalDateTime loggedAt = req.getLoggedAt() != null ? req.getLoggedAt() : LocalDateTime.now();
        FoodEntry entry = FoodEntry.builder()
                .memberId(memberId)
                .gymId(member.getGymId())
                .logDate(loggedAt.toLocalDate())
                .foodName(req.getFoodName())
                .foodNameAr(req.getFoodNameAr())
                .quantity(req.getQuantity())
                .unit(req.getUnit())
                .mealType(req.getMealType())
                .calories(req.getCalories())
                .proteinG(req.getProtein())
                .carbsG(req.getCarbs())
                .fatG(req.getFat())
                .fiberG(req.getFiber())
                .sugarG(req.getSugar())
                .confidence(1.0)
                .source("MANUAL")
                .rawInput(req.getFoodName())
                .loggedAt(loggedAt)
                .build();
        entry = foodEntryRepository.save(entry);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("entry", buildEntryMap(entry));
        result.put("dailySummary", buildDailySummary(memberId, loggedAt.toLocalDate()));
        return result;
    }

    // ─────────────────────────────────────────────────────────
    // UPDATE / DELETE FOOD ENTRY
    // ─────────────────────────────────────────────────────────

    @Transactional
    public Map<String, Object> updateEntry(String callerEmail, UUID entryId, FoodLogRequest req) {
        User caller = loadUser(callerEmail);
        FoodEntry entry = foodEntryRepository.findById(entryId)
                .orElseThrow(() -> new AppException("Entry not found", "السجل غير موجود", HttpStatus.NOT_FOUND));
        assertCanModifyEntry(caller, entry);
        assertWorkflowAllowsWrite(caller);

        Map<String, Object> nutrition = resolveFood(entry.getFoodName(), req.getQuantity(), req.getUnit(), caller);
        entry.setQuantity(req.getQuantity());
        entry.setUnit(req.getUnit());
        entry.setMealType(req.getMealType());
        entry.setCalories(getD(nutrition, "calories"));
        entry.setProteinG(getD(nutrition, "protein"));
        entry.setCarbsG(getD(nutrition, "carbs"));
        entry.setFatG(getD(nutrition, "fat"));
        entry.setFiberG(getD(nutrition, "fiber"));
        entry.setSugarG(getD(nutrition, "sugar"));
        entry.setConfidence(getD(nutrition, "confidence"));
        entry.setSource((String) nutrition.getOrDefault("source", entry.getSource()));
        if (req.getLoggedAt() != null) {
            entry.setLoggedAt(req.getLoggedAt());
            entry.setLogDate(req.getLoggedAt().toLocalDate());
        }
        entry = foodEntryRepository.save(entry);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("entry", buildEntryMap(entry));
        result.put("dailySummary", buildDailySummary(entry.getMemberId(), entry.getLoggedAt().toLocalDate()));
        return result;
    }

    @Transactional
    public void deleteEntry(String callerEmail, UUID entryId) {
        User caller = loadUser(callerEmail);
        FoodEntry entry = foodEntryRepository.findById(entryId)
                .orElseThrow(() -> new AppException("Entry not found", "السجل غير موجود", HttpStatus.NOT_FOUND));
        assertCanModifyEntry(caller, entry);
        assertWorkflowAllowsWrite(caller);
        foodEntryRepository.delete(entry);
    }

    // ─────────────────────────────────────────────────────────
    // TODAY LOG
    // ─────────────────────────────────────────────────────────

    public Map<String, Object> getTodayLog(String callerEmail, UUID memberId) {
        User caller = loadUser(callerEmail);
        User member = loadMemberById(memberId);
        assertCanViewMember(caller, member);
        return buildTodayLog(memberId, LocalDate.now());
    }

    // ─────────────────────────────────────────────────────────
    // HISTORY
    // ─────────────────────────────────────────────────────────

    public List<Map<String, Object>> getHistory(String callerEmail, UUID memberId, int days) {
        User caller = loadUser(callerEmail);
        User member = loadMemberById(memberId);
        assertCanViewMember(caller, member);

        Optional<NutritionTarget> targetOpt = nutritionTargetRepository.findByMemberId(memberId);
        int targetCal = targetOpt.map(NutritionTarget::getCalories).orElse(0);
        int targetProt = targetOpt.map(NutritionTarget::getProteinG).orElse(0);

        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = days - 1; i >= 0; i--) {
            LocalDate date = LocalDate.now().minusDays(i);
            LocalDateTime from = date.atStartOfDay();
            LocalDateTime to = date.atTime(LocalTime.MAX);
            List<FoodEntry> entries = foodEntryRepository.findByMemberIdAndDateRange(memberId, from, to);
            List<WaterLog> waterLogs = waterLogRepository.findTodayLogs(memberId, from, to);

            double totalCal = entries.stream().mapToDouble(e -> e.getCalories() != null ? e.getCalories() : 0).sum();
            double totalProt = entries.stream().mapToDouble(e -> e.getProteinG() != null ? e.getProteinG() : 0).sum();
            double totalCarbs = entries.stream().mapToDouble(e -> e.getCarbsG() != null ? e.getCarbsG() : 0).sum();
            double totalFat = entries.stream().mapToDouble(e -> e.getFatG() != null ? e.getFatG() : 0).sum();
            int waterMl = waterLogs.stream().mapToInt(w -> w.getAmountMl() != null ? w.getAmountMl() : 0).sum();

            boolean goalMet = targetCal > 0
                    && totalCal >= targetCal * 0.9 && totalCal <= targetCal * 1.1
                    && (targetProt == 0 || totalProt >= targetProt * 0.9);

            Map<String, Object> day = new LinkedHashMap<>();
            day.put("date", date.toString());
            day.put("totalCalories", Math.round(totalCal));
            day.put("totalProtein", Math.round(totalProt));
            day.put("totalCarbs", Math.round(totalCarbs));
            day.put("totalFat", Math.round(totalFat));
            day.put("targetCalories", targetCal);
            day.put("targetProtein", targetProt);
            day.put("goalMet", goalMet);
            day.put("entriesCount", entries.size());
            day.put("waterTotal", Math.round(waterMl / 100.0) / 10.0);
            result.add(day);
        }
        return result;
    }

    // ─────────────────────────────────────────────────────────
    // WATER
    // ─────────────────────────────────────────────────────────

    @Transactional
    public Map<String, Object> logWater(String callerEmail, WaterAddRequest req) {
        User caller = loadUser(callerEmail);
        UUID memberId = resolveMemberId(caller, req.getMemberId());
        User member = loadMemberById(memberId);
        assertCanViewMember(caller, member);
        assertWorkflowAllowsWrite(caller);

        LocalDateTime loggedAt = req.getLoggedAt() != null ? req.getLoggedAt() : LocalDateTime.now();
        WaterLog log = WaterLog.builder()
                .memberId(memberId)
                .gymId(member.getGymId())
                .logDate(loggedAt.toLocalDate())
                .amountMl((int) (req.getAmount() * 1000))
                .loggedAt(loggedAt)
                .build();
        waterLogRepository.save(log);
        return buildWaterSummary(memberId, loggedAt.toLocalDate());
    }

    public Map<String, Object> getTodayWater(String callerEmail, UUID memberId) {
        User caller = loadUser(callerEmail);
        User member = loadMemberById(memberId);
        assertCanViewMember(caller, member);
        return buildWaterSummary(memberId, LocalDate.now());
    }

    // ─────────────────────────────────────────────────────────
    // MEAL SUGGESTIONS
    // ─────────────────────────────────────────────────────────

    @Transactional
    public Map<String, Object> createSuggestion(String callerEmail, MealSuggestionRequest req) {
        User caller = loadUser(callerEmail);
        User member = loadMemberById(req.getMemberId());
        assertSameGym(caller, member);
        assertCanManageTarget(caller, member);

        MealSuggestion s = MealSuggestion.builder()
                .gymId(member.getGymId())
                .memberId(req.getMemberId())
                .createdByUserId(caller.getId())
                .mealType(req.getMealType())
                .description(req.getDescription())
                .descriptionAr(req.getDescriptionAr())
                .targetCalories(req.getTargetCalories())
                .targetProtein(req.getTargetProtein())
                .build();
        s = mealSuggestionRepository.save(s);
        return buildSuggestionMap(s);
    }

    public List<Map<String, Object>> getSuggestions(String callerEmail, UUID memberId) {
        User caller = loadUser(callerEmail);
        User member = loadMemberById(memberId);
        assertCanViewMember(caller, member);
        return mealSuggestionRepository.findByMemberIdOrderByCreatedAtDesc(memberId)
                .stream().map(this::buildSuggestionMap).collect(Collectors.toList());
    }

    @Transactional
    public void deleteSuggestion(String callerEmail, UUID suggestionId) {
        User caller = loadUser(callerEmail);
        MealSuggestion s = mealSuggestionRepository.findById(suggestionId)
                .orElseThrow(() -> new AppException("Suggestion not found", "الاقتراح غير موجود", HttpStatus.NOT_FOUND));
        if (!caller.getGymId().equals(s.getGymId()))
            throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);
        if (!s.getCreatedByUserId().equals(caller.getId())
                && caller.getRole() != Role.GYM_ADMIN
                && caller.getRole() != Role.NUTRITIONIST
                && caller.getRole() != Role.SUPER_ADMIN)
            throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);
        assertWorkflowAllowsWrite(caller);
        mealSuggestionRepository.delete(s);
    }

    // ─────────────────────────────────────────────────────────
    // RECENT FOODS
    // ─────────────────────────────────────────────────────────

    public List<Map<String, Object>> getRecentFoods(String callerEmail) {
        User caller = loadUser(callerEmail);
        List<FoodEntry> all = foodEntryRepository.findByMemberIdOrderByLoggedAtDesc(caller.getId());
        Set<String> seen = new LinkedHashSet<>();
        List<Map<String, Object>> result = new ArrayList<>();
        for (FoodEntry e : all) {
            if (seen.add(e.getFoodName().toLowerCase()) && result.size() < 10)
                result.add(buildEntryMap(e));
        }
        return result;
    }

    // ─────────────────────────────────────────────────────────
    // STAFF: member list with today adherence
    // ─────────────────────────────────────────────────────────

    public List<Map<String, Object>> getStaffMemberList(String callerEmail) {
        User caller = loadUser(callerEmail);
        List<User> members;

        if (caller.getRole() == Role.COACH) {
            List<UUID> ids = coachMemberRepository.findByCoachId(caller.getId())
                    .stream().map(CoachMember::getMemberId).collect(Collectors.toList());
            members = userRepository.findAllById(ids);
        } else {
            members = userRepository.findByGymIdAndRole(caller.getGymId(), Role.MEMBER);
        }

        LocalDate today = LocalDate.now();
        LocalDateTime from = today.atStartOfDay();
        LocalDateTime to = today.atTime(LocalTime.MAX);
        List<Map<String, Object>> result = new ArrayList<>();

        for (User m : members) {
            Optional<NutritionTarget> tOpt = nutritionTargetRepository.findByMemberId(m.getId());
            List<FoodEntry> todayEntries = foodEntryRepository.findByMemberIdAndDateRange(m.getId(), from, to);
            double todayCal = todayEntries.stream().mapToDouble(e -> e.getCalories() != null ? e.getCalories() : 0).sum();
            double todayProt = todayEntries.stream().mapToDouble(e -> e.getProteinG() != null ? e.getProteinG() : 0).sum();
            int tCal = tOpt.map(NutritionTarget::getCalories).orElse(0);
            int tProt = tOpt.map(NutritionTarget::getProteinG).orElse(0);

            List<FoodEntry> recent = todayEntries.isEmpty()
                    ? foodEntryRepository.findByMemberIdOrderByLoggedAtDesc(m.getId())
                    : todayEntries;
            LocalDateTime lastLogged = recent.isEmpty() ? null : recent.get(recent.size() - 1).getLoggedAt();
            if (!recent.isEmpty() && todayEntries.isEmpty()) lastLogged = recent.get(0).getLoggedAt();

            double adherence = calcAdherence7Days(m.getId(), tCal, tProt);

            String status;
            if (tOpt.isEmpty()) status = "NO_TARGET";
            else if (todayEntries.isEmpty()) status = "NO_LOG";
            else if (tCal > 0 && todayCal > tCal * 1.1) status = "OVER";
            else if (tCal > 0 && todayCal < tCal * 0.9) status = "UNDER";
            else status = "ON_TRACK";

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("memberId", m.getId());
            row.put("name", m.getName());
            row.put("phoneNumber", m.getPhone());
            row.put("hasTarget", tOpt.isPresent());
            row.put("todayCalories", Math.round(todayCal));
            row.put("targetCalories", tCal);
            row.put("todayProtein", Math.round(todayProt));
            row.put("targetProtein", tProt);
            row.put("adherence7Days", Math.round(adherence));
            row.put("lastLoggedAt", lastLogged != null ? lastLogged.toString() : null);
            row.put("status", status);
            result.add(row);
        }
        return result;
    }

    // ─────────────────────────────────────────────────────────
    // STAFF: full member overview
    // ─────────────────────────────────────────────────────────

    public Map<String, Object> getStaffMemberOverview(String callerEmail, UUID memberId) {
        User caller = loadUser(callerEmail);
        User member = loadMemberById(memberId);
        assertCanViewMember(caller, member);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("memberId", member.getId());
        result.put("name", member.getName());
        result.put("email", member.getEmail());

        Optional<NutritionTarget> tOpt = nutritionTargetRepository.findByMemberId(memberId);
        result.put("target", tOpt.map(this::buildTargetMap).orElse(null));
        result.put("hasTarget", tOpt.isPresent());
        result.put("today", buildTodayLog(memberId, LocalDate.now()));

        List<Map<String, Object>> history = getHistory(callerEmail, memberId, 7);
        result.put("last7Days", history);

        int tCal = tOpt.map(NutritionTarget::getCalories).orElse(0);
        int tProt = tOpt.map(NutritionTarget::getProteinG).orElse(0);
        result.put("adherence7Days", Math.round(calcAdherence7Days(memberId, tCal, tProt)));

        double avgCal = history.stream().mapToLong(d -> (long) ((Number) d.get("totalCalories")).longValue()).average().orElse(0);
        double avgProt = history.stream().mapToLong(d -> (long) ((Number) d.get("totalProtein")).longValue()).average().orElse(0);
        result.put("weeklyAvgCalories", Math.round(avgCal));
        result.put("weeklyAvgProtein", Math.round(avgProt));
        result.put("suggestions", mealSuggestionRepository.findByMemberIdOrderByCreatedAtDesc(memberId)
                .stream().map(this::buildSuggestionMap).collect(Collectors.toList()));
        return result;
    }

    // ─────────────────────────────────────────────────────────
    // CORE: cache-first food resolution
    // ─────────────────────────────────────────────────────────

    private Map<String, Object> resolveFood(String foodName, double quantity, String unit, User caller) {
        List<ArabicFoodCache> matches = foodCacheRepository.search(foodName.trim());
        if (!matches.isEmpty()) {
            ArabicFoodCache hit = matches.get(0);
            double scale = scaleFactor(quantity, unit, hit.getDefaultQuantity(), hit.getDefaultUnit());
            if (scale > 0) {
                hit.setSearchCount(hit.getSearchCount() + 1);
                foodCacheRepository.save(hit);
                Map<String, Object> r = new LinkedHashMap<>();
                r.put("foodName", hit.getFoodName());
                r.put("foodNameAr", hit.getFoodNameAr());
                r.put("quantity", quantity);
                r.put("unit", unit);
                r.put("calories", round2(hit.getCalories() * scale));
                r.put("protein", round2(hit.getProtein() * scale));
                r.put("carbs", round2(hit.getCarbs() * scale));
                r.put("fat", round2(hit.getFat() * scale));
                r.put("fiber", hit.getFiber() != null ? round2(hit.getFiber() * scale) : null);
                r.put("sugar", hit.getSugar() != null ? round2(hit.getSugar() * scale) : null);
                r.put("sodium", hit.getSodium() != null ? round2(hit.getSodium() * scale) : null);
                r.put("confidence", 0.95);
                r.put("source", "DATABASE");
                return r;
            }
        }
        return callAiWithFallback(foodName, quantity, unit, caller);
    }

    private double scaleFactor(double rq, String ru, double dq, String du) {
        String r = norm(ru), d = norm(du);
        if (r.equals(d)) return rq / dq;
        if (isWeight(r) && isWeight(d)) return toG(rq, r) / toG(dq, d);
        if (isVol(r) && isVol(d)) return toMl(rq, r) / toMl(dq, d);
        return 0;
    }

    private String norm(String u) { return u == null ? "g" : u.toLowerCase().trim(); }
    private boolean isWeight(String u) { return u.equals("g") || u.equals("gram") || u.equals("grams") || u.equals("kg"); }
    private boolean isVol(String u) { return u.equals("ml") || u.equals("liter") || u.equals("l"); }
    private double toG(double q, String u) { return u.equals("kg") ? q * 1000 : q; }
    private double toMl(double q, String u) { return (u.equals("liter") || u.equals("l")) ? q * 1000 : q; }
    private double round2(double v) { return Math.round(v * 100.0) / 100.0; }

    private Map<String, Object> callAiWithFallback(String foodName, double qty, String unit, User caller) {
        LocalDateTime since = LocalDate.now().atStartOfDay();
        long used = aiNutritionLogRepository.countSuccessfulSince(caller.getId(), since);
        if (used >= AI_DAILY_LIMIT)
            throw new AppException(
                "Daily AI calculation limit reached. Use cached foods or try tomorrow.",
                "تم تجاوز الحد اليومي. استخدم الأطعمة المحفوظة أو حاول غداً.",
                HttpStatus.TOO_MANY_REQUESTS);

        if (openAiKey != null && !openAiKey.isBlank()) {
            try {
                Map<String, Object> res = callOpenAI(foodName, qty, unit);
                logAiSuccess(caller.getId(), caller.getGymId(), foodName, qty, unit, res);
                cacheAiResult(res, qty, unit);
                return res;
            } catch (AppException e) { throw e; }
            catch (Exception e) {
                log.warn("OpenAI nutrition call failed: {}", e.getMessage());
                logAiFailure(caller.getId(), caller.getGymId(), foodName, qty, unit, e.getMessage());
            }
        }
        return estimateFallback(foodName, qty, unit);
    }

    private Map<String, Object> callOpenAI(String foodName, double qty, String unit) throws Exception {
        String prompt = "You are a nutrition calculator for Middle Eastern/Arabic cuisine.\n" +
                "Calculate nutrition values and return ONLY valid JSON.\n\n" +
                "Food: " + foodName + "\nQuantity: " + qty + " " + unit + "\n\n" +
                "Return ONLY this JSON: {\"foodName\":\"English\",\"foodNameAr\":\"Arabic\"," +
                "\"calories\":number,\"protein\":number,\"carbs\":number,\"fat\":number," +
                "\"fiber\":number,\"sugar\":number,\"sodium\":number,\"confidence\":0_to_1,\"notes\":\"optional\"}";

        String body = objectMapper.writeValueAsString(Map.of(
                "model", nutritionModel,
                "messages", List.of(Map.of("role", "user", "content", prompt)),
                "response_format", Map.of("type", "json_object"),
                "max_tokens", 400,
                "temperature", 0));

        HttpClient client = HttpClient.newHttpClient();
        HttpResponse<String> resp = client.send(
                HttpRequest.newBuilder().uri(URI.create("https://api.openai.com/v1/chat/completions"))
                        .header("Authorization", "Bearer " + openAiKey)
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(body)).build(),
                HttpResponse.BodyHandlers.ofString());

        if (resp.statusCode() != 200)
            throw new RuntimeException("OpenAI returned " + resp.statusCode());

        JsonNode root = objectMapper.readTree(resp.body());
        String content = root.path("choices").get(0).path("message").path("content").asText();
        JsonNode data = objectMapper.readTree(content);

        Map<String, Object> r = new LinkedHashMap<>();
        r.put("foodName", data.path("foodName").asText(foodName));
        r.put("foodNameAr", data.path("foodNameAr").asText(""));
        r.put("quantity", qty);
        r.put("unit", unit);
        r.put("calories", data.path("calories").asDouble(0));
        r.put("protein", data.path("protein").asDouble(0));
        r.put("carbs", data.path("carbs").asDouble(0));
        r.put("fat", data.path("fat").asDouble(0));
        r.put("fiber", data.path("fiber").asDouble(0));
        r.put("sugar", data.path("sugar").asDouble(0));
        r.put("sodium", data.path("sodium").asDouble(0));
        r.put("confidence", data.path("confidence").asDouble(0.7));
        r.put("notes", data.path("notes").asText(""));
        r.put("source", "AI_CALCULATED");
        return r;
    }

    private void cacheAiResult(Map<String, Object> res, double qty, String unit) {
        String name = (String) res.get("foodName");
        if (name == null || name.isBlank()) return;
        if (!foodCacheRepository.existsByFoodNameIgnoreCase(name)) {
            try {
                foodCacheRepository.save(ArabicFoodCache.builder()
                        .foodName(name)
                        .foodNameAr((String) res.getOrDefault("foodNameAr", ""))
                        .defaultQuantity(qty).defaultUnit(unit)
                        .calories(getD(res, "calories")).protein(getD(res, "protein"))
                        .carbs(getD(res, "carbs")).fat(getD(res, "fat"))
                        .fiber(getD(res, "fiber")).sugar(getD(res, "sugar"))
                        .sodium(getD(res, "sodium")).source(ArabicFoodSource.AI).build());
            } catch (Exception ignored) {}
        }
    }

    private Map<String, Object> estimateFallback(String foodName, double qty, String unit) {
        String l = foodName.toLowerCase();
        double cal = 200, prot = 10, carbs = 25, fat = 5;
        if (l.contains("egg") || l.contains("بيض")) { cal = 78; prot = 6; carbs = 0; fat = 5; }
        else if (l.contains("chicken") || l.contains("دجاج")) { cal = 165; prot = 31; carbs = 0; fat = 4; }
        else if (l.contains("rice") || l.contains("أرز")) { cal = 130; prot = 3; carbs = 28; fat = 0; }
        else if (l.contains("shawarma") || l.contains("شاورما")) { cal = 450; prot = 38; carbs = 35; fat = 16; }

        Map<String, Object> r = new LinkedHashMap<>();
        r.put("foodName", foodName); r.put("foodNameAr", "");
        r.put("quantity", qty); r.put("unit", unit);
        r.put("calories", cal); r.put("protein", prot);
        r.put("carbs", carbs); r.put("fat", fat);
        r.put("fiber", 0.0); r.put("sugar", 0.0); r.put("sodium", 0.0);
        r.put("confidence", 0.5);
        r.put("notes", "Offline estimate. Please verify quantity.");
        r.put("source", "AI_CALCULATED");
        return r;
    }

    // ─────────────────────────────────────────────────────────
    // BUILD HELPERS
    // ─────────────────────────────────────────────────────────

    private Map<String, Object> buildTodayLog(UUID memberId, LocalDate date) {
        LocalDateTime from = date.atStartOfDay();
        LocalDateTime to = date.atTime(LocalTime.MAX);
        List<FoodEntry> entries = foodEntryRepository.findByMemberIdAndDateRange(memberId, from, to);
        List<WaterLog> waterLogs = waterLogRepository.findTodayLogs(memberId, from, to);

        Map<String, List<Map<String, Object>>> grouped = new LinkedHashMap<>();
        for (String meal : List.of("BREAKFAST", "LUNCH", "DINNER", "SNACK", "PRE_WORKOUT", "POST_WORKOUT"))
            grouped.put(meal, new ArrayList<>());
        for (FoodEntry e : entries) {
            String mt = e.getMealType() != null ? e.getMealType().toUpperCase() : "SNACK";
            grouped.computeIfAbsent(mt, k -> new ArrayList<>()).add(buildEntryMap(e));
        }

        double totalCal   = entries.stream().mapToDouble(e -> e.getCalories() != null ? e.getCalories() : 0).sum();
        double totalProt  = entries.stream().mapToDouble(e -> e.getProteinG() != null ? e.getProteinG() : 0).sum();
        double totalCarbs = entries.stream().mapToDouble(e -> e.getCarbsG() != null ? e.getCarbsG() : 0).sum();
        double totalFat   = entries.stream().mapToDouble(e -> e.getFatG() != null ? e.getFatG() : 0).sum();
        int waterMl = waterLogs.stream().mapToInt(w -> w.getAmountMl() != null ? w.getAmountMl() : 0).sum();

        // Resolve targets: NutritionPlanDay takes priority over NutritionTarget default
        Optional<NutritionPlanDay> planDay = nutritionPlanDayRepository
                .findActiveplanDayForMemberAndDate(memberId, date);
        Optional<NutritionTarget> tOpt = nutritionTargetRepository.findByMemberId(memberId);

        int tCal, tProt, tCarbs, tFat, tWaterMl;
        Map<String, Object> targetMap;
        Map<String, Object> planDayMap = null;

        if (planDay.isPresent()) {
            NutritionPlanDay pd = planDay.get();
            tCal    = pd.getTargetCalories() != null ? pd.getTargetCalories() : (tOpt.map(NutritionTarget::getCalories).orElse(0));
            tProt   = pd.getTargetProtein()  != null ? pd.getTargetProtein()  : (tOpt.map(NutritionTarget::getProteinG).orElse(0));
            tCarbs  = pd.getTargetCarbs()    != null ? pd.getTargetCarbs()    : (tOpt.map(NutritionTarget::getCarbsG).orElse(0));
            tFat    = pd.getTargetFat()      != null ? pd.getTargetFat()      : (tOpt.map(NutritionTarget::getFatG).orElse(0));
            tWaterMl = pd.getTargetWater()   != null ? pd.getTargetWater()    : (tOpt.map(t -> t.getWaterMl() != null ? t.getWaterMl() : 2000).orElse(2000));
            // Build a blended target map for the response
            targetMap = new LinkedHashMap<>();
            targetMap.put("targetCalories", tCal); targetMap.put("targetProtein", tProt);
            targetMap.put("targetCarbs", tCarbs);  targetMap.put("targetFat", tFat);
            targetMap.put("targetWater", tWaterMl / 1000.0);
            targetMap.put("goal", pd.getGoal() != null ? pd.getGoal() : tOpt.map(NutritionTarget::getGoal).orElse(null));
            targetMap.put("notes", pd.getNotes());
            targetMap.put("notesAr", pd.getNotesAr());
            targetMap.put("source", "PLAN_DAY");
            planDayMap = buildPlanDayTargetMap(pd);
        } else {
            tCal    = tOpt.map(NutritionTarget::getCalories).orElse(0);
            tProt   = tOpt.map(NutritionTarget::getProteinG).orElse(0);
            tCarbs  = tOpt.map(NutritionTarget::getCarbsG).orElse(0);
            tFat    = tOpt.map(NutritionTarget::getFatG).orElse(0);
            tWaterMl = tOpt.map(t -> t.getWaterMl() != null ? t.getWaterMl() : 2000).orElse(2000);
            targetMap = tOpt.map(t -> { Map<String, Object> m = buildTargetMap(t); m.put("source", "DEFAULT"); return m; }).orElse(null);
        }

        Map<String, Object> totals = new LinkedHashMap<>();
        totals.put("calories", macroSummary(totalCal, tCal));
        totals.put("protein",  macroSummary(totalProt, tProt));
        totals.put("carbs",    macroSummary(totalCarbs, tCarbs));
        totals.put("fat",      macroSummary(totalFat, tFat));
        totals.put("water", Map.of(
                "consumed",   waterMl / 1000.0,
                "target",     tWaterMl / 1000.0,
                "remaining",  Math.max(0, (tWaterMl - waterMl) / 1000.0),
                "percentage", tWaterMl > 0 ? Math.round(waterMl * 100.0 / tWaterMl) : 0));

        // Resolve suggestions: plan-day first, then by date, then general
        List<Map<String, Object>> suggestions;
        if (planDay.isPresent()) {
            suggestions = mealSuggestionRepository.findByPlanDayIdOrderByCreatedAtAsc(planDay.get().getId())
                    .stream().map(this::buildSuggestionMap).collect(Collectors.toList());
        } else {
            suggestions = mealSuggestionRepository.findByMemberIdAndSuggestionDateOrderByCreatedAtAsc(memberId, date)
                    .stream().map(this::buildSuggestionMap).collect(Collectors.toList());
            if (suggestions.isEmpty()) {
                suggestions = mealSuggestionRepository.findGeneralSuggestionsForMember(memberId)
                        .stream().limit(5).map(this::buildSuggestionMap).collect(Collectors.toList());
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("date",          date.toString());
        result.put("target",        targetMap);
        result.put("todayPlanDay",  planDayMap);
        result.put("entriesByMeal", grouped);
        result.put("totals",        totals);
        result.put("suggestions",   suggestions);
        return result;
    }

    private Map<String, Object> buildPlanDayTargetMap(NutritionPlanDay d) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", d.getId()); m.put("planId", d.getPlanId());
        m.put("dayDate", d.getDayDate().toString()); m.put("dayName", d.getDayName());
        m.put("dayNameAr", d.getDayNameAr());
        m.put("targetCalories", d.getTargetCalories()); m.put("targetProtein", d.getTargetProtein());
        m.put("targetCarbs", d.getTargetCarbs()); m.put("targetFat", d.getTargetFat());
        m.put("targetWater", d.getTargetWater() != null ? d.getTargetWater() / 1000.0 : null);
        m.put("goal", d.getGoal()); m.put("notes", d.getNotes()); m.put("notesAr", d.getNotesAr());
        return m;
    }

    private Map<String, Object> macroSummary(double consumed, int target) {
        long c = Math.round(consumed);
        return Map.of("consumed", c, "target", target,
                "remaining", Math.max(0, target - c),
                "percentage", target > 0 ? (int) Math.round(consumed * 100.0 / target) : 0);
    }

    private Map<String, Object> buildDailySummary(UUID memberId, LocalDate date) {
        return (Map<String, Object>) buildTodayLog(memberId, date).get("totals");
    }

    private Map<String, Object> buildWaterSummary(UUID memberId, LocalDate date) {
        LocalDateTime from = date.atStartOfDay(), to = date.atTime(LocalTime.MAX);
        List<WaterLog> logs = waterLogRepository.findTodayLogs(memberId, from, to);
        int totalMl = logs.stream().mapToInt(w -> w.getAmountMl() != null ? w.getAmountMl() : 0).sum();
        int tMl = nutritionTargetRepository.findByMemberId(memberId)
                .map(t -> t.getWaterMl() != null ? t.getWaterMl() : 2000).orElse(2000);

        List<Map<String, Object>> logMaps = logs.stream().map(w -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", w.getId()); m.put("amount", w.getAmountMl() / 1000.0);
            m.put("loggedAt", w.getLoggedAt().toString()); return m;
        }).collect(Collectors.toList());

        return Map.of("consumed", totalMl / 1000.0, "target", tMl / 1000.0,
                "remaining", Math.max(0, (tMl - totalMl) / 1000.0),
                "percentage", tMl > 0 ? Math.round(totalMl * 100.0 / tMl) : 0,
                "logs", logMaps);
    }

    private double calcAdherence7Days(UUID memberId, int tCal, int tProt) {
        if (tCal == 0) return 0;
        int met = 0;
        for (int i = 0; i < 7; i++) {
            LocalDate date = LocalDate.now().minusDays(i);
            List<FoodEntry> e = foodEntryRepository.findByMemberIdAndDateRange(
                    memberId, date.atStartOfDay(), date.atTime(LocalTime.MAX));
            double cal = e.stream().mapToDouble(x -> x.getCalories() != null ? x.getCalories() : 0).sum();
            double prot = e.stream().mapToDouble(x -> x.getProteinG() != null ? x.getProteinG() : 0).sum();
            if (cal >= tCal * 0.9 && cal <= tCal * 1.1 && (tProt == 0 || prot >= tProt * 0.9)) met++;
        }
        return met / 7.0 * 100;
    }

    private Map<String, Object> buildTargetMap(NutritionTarget t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", t.getId()); m.put("memberId", t.getMemberId());
        m.put("targetCalories", t.getCalories()); m.put("targetProtein", t.getProteinG());
        m.put("targetCarbs", t.getCarbsG()); m.put("targetFat", t.getFatG());
        m.put("targetWater", t.getWaterMl() != null ? t.getWaterMl() / 1000.0 : null);
        m.put("goal", t.getGoal()); m.put("notes", t.getNotes());
        m.put("createdByRole", t.getCreatedByRole());
        m.put("updatedAt", t.getUpdatedAt() != null ? t.getUpdatedAt().toString() : null);
        return m;
    }

    private Map<String, Object> buildEntryMap(FoodEntry e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", e.getId()); m.put("foodName", e.getFoodName());
        m.put("foodNameAr", e.getFoodNameAr()); m.put("quantity", e.getQuantity());
        m.put("unit", e.getUnit()); m.put("mealType", e.getMealType());
        m.put("calories", e.getCalories()); m.put("protein", e.getProteinG());
        m.put("carbs", e.getCarbsG()); m.put("fat", e.getFatG());
        m.put("fiber", e.getFiberG()); m.put("sugar", e.getSugarG());
        m.put("sodium", e.getSodium()); m.put("confidence", e.getConfidence());
        m.put("source", e.getSource()); m.put("loggedAt", e.getLoggedAt().toString());
        return m;
    }

    private Map<String, Object> buildCacheItemMap(ArabicFoodCache f) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", f.getId()); m.put("foodName", f.getFoodName());
        m.put("foodNameAr", f.getFoodNameAr()); m.put("defaultQuantity", f.getDefaultQuantity());
        m.put("defaultUnit", f.getDefaultUnit()); m.put("calories", f.getCalories());
        m.put("protein", f.getProtein()); m.put("carbs", f.getCarbs());
        m.put("fat", f.getFat()); m.put("fiber", f.getFiber());
        m.put("sugar", f.getSugar()); m.put("source", f.getSource());
        return m;
    }

    private Map<String, Object> buildSuggestionMap(MealSuggestion s) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", s.getId()); m.put("mealType", s.getMealType());
        m.put("description", s.getDescription()); m.put("descriptionAr", s.getDescriptionAr());
        m.put("targetCalories", s.getTargetCalories()); m.put("targetProtein", s.getTargetProtein());
        m.put("createdAt", s.getCreatedAt().toString());
        return m;
    }

    // ─────────────────────────────────────────────────────────
    // ACCESS + AUTH HELPERS
    // ─────────────────────────────────────────────────────────

    private User loadUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));
    }

    private User loadMemberById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new AppException("Member not found", "العضو غير موجود", HttpStatus.NOT_FOUND));
    }

    private UUID resolveMemberId(User caller, UUID req) {
        return (caller.getRole() == Role.MEMBER) ? caller.getId() : (req != null ? req : caller.getId());
    }

    private void assertSameGym(User a, User b) {
        if (!a.getGymId().equals(b.getGymId()))
            throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);
    }

    private void assertCanViewMember(User caller, User member) {
        switch (caller.getRole()) {
            case MEMBER -> { if (!caller.getId().equals(member.getId())) throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN); }
            case COACH, NUTRITIONIST, GYM_ADMIN -> assertSameGym(caller, member);
            case SUPER_ADMIN -> {}
            default -> throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);
        }
    }

    /**
     * Enforces the gym's nutritionWorkflow setting for any write operation.
     * <ul>
     *   <li>COACH_ONLY      — NUTRITIONIST is blocked (403)</li>
     *   <li>NUTRITIONIST_ONLY — COACH is blocked (403)</li>
     *   <li>COACH_AND_NUTRITIONIST — both are allowed</li>
     * </ul>
     * MEMBER may write only when their {@code selfTrainingEnabled} flag is true; otherwise 403.
     * GYM_ADMIN and SUPER_ADMIN are always exempt.
     * Read operations should never call this method.
     */
    private void assertWorkflowAllowsWrite(User caller) {
        Role role = caller.getRole();
        if (role == Role.GYM_ADMIN || role == Role.SUPER_ADMIN) return;
        if (role == Role.MEMBER) {
            if (!caller.isSelfTrainingEnabled()) {
                throw new AppException(
                        "Self-training mode must be enabled to log your own nutrition.",
                        "يجب تفعيل وضع التدريب الذاتي لتسجيل تغذيتك بنفسك.",
                        HttpStatus.FORBIDDEN);
            }
            return;
        }
        if (role != Role.COACH && role != Role.NUTRITIONIST) return;
        NutritionWorkflow wf = gymRepository.findById(caller.getGymId())
                .map(Gym::getNutritionWorkflow)
                .orElse(NutritionWorkflow.COACH_ONLY);
        if (role == Role.COACH && wf == NutritionWorkflow.NUTRITIONIST_ONLY)
            throw new AppException(
                    "Nutrition plans for this gym are managed by the nutrition department only.",
                    "خطط التغذية في هذا النادي تديرها قسم التغذية فقط.", HttpStatus.FORBIDDEN);
        if (role == Role.NUTRITIONIST && wf == NutritionWorkflow.COACH_ONLY)
            throw new AppException(
                    "Nutrition plans for this gym are managed by coaches only.",
                    "خطط التغذية في هذا النادي يديرها المدربون فقط.", HttpStatus.FORBIDDEN);
    }

    private void assertCanManageTarget(User caller, User member) {
        if (caller.getRole() == Role.GYM_ADMIN || caller.getRole() == Role.SUPER_ADMIN) return;
        if (caller.getRole() != Role.COACH && caller.getRole() != Role.NUTRITIONIST)
            throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);
        assertWorkflowAllowsWrite(caller);
    }

    private void assertCanModifyEntry(User caller, FoodEntry entry) {
        switch (caller.getRole()) {
            case MEMBER -> { if (!caller.getId().equals(entry.getMemberId())) throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN); }
            case COACH, NUTRITIONIST, GYM_ADMIN -> { if (entry.getGymId() != null && !caller.getGymId().equals(entry.getGymId())) throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN); }
            case SUPER_ADMIN -> {}
            default -> throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);
        }
    }

    private double getD(Map<String, Object> m, String k) {
        Object v = m.get(k); if (v == null) return 0.0;
        if (v instanceof Number n) return n.doubleValue();
        try { return Double.parseDouble(v.toString()); } catch (Exception e) { return 0.0; }
    }

    private void logAiSuccess(UUID mid, UUID gid, String input, double qty, String unit, Map<String, Object> res) {
        try {
            aiNutritionLogRepository.save(AiNutritionLog.builder()
                    .memberId(mid).gymId(gid).inputText(input).quantity(qty).unit(unit)
                    .responseJson(objectMapper.writeValueAsString(res)).success(true)
                    .confidence(getD(res, "confidence")).build());
        } catch (Exception ignored) {}
    }

    private void logAiFailure(UUID mid, UUID gid, String input, double qty, String unit, String err) {
        try {
            aiNutritionLogRepository.save(AiNutritionLog.builder()
                    .memberId(mid).gymId(gid).inputText(input).quantity(qty).unit(unit)
                    .success(false).errorMessage(err).build());
        } catch (Exception ignored) {}
    }
}
