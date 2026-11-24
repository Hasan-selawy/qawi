package com.qawi.service;

import com.qawi.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.*;

/** Compatibility adapter. V2 owns nutrition persistence, access/workflow policy, analysis and summaries. */
@Service
@RequiredArgsConstructor
public class NutritionV3Service {
    private final NutritionV2Service canonical;

    public Map<String, Object> setTarget(String email, NutritionTargetRequest request) {
        NutritionTargetSetRequest target = new NutritionTargetSetRequest();
        target.setMemberId(request.getMemberId()); target.setTargetCalories(request.getCalories());
        target.setTargetProtein(request.getProteinG()); target.setTargetCarbs(request.getCarbsG());
        target.setTargetFat(request.getFatG()); target.setTargetWater(request.getWaterMl() / 1000.0);
        target.setGoal(request.getGoal());
        target.setNotes((String) canonical.getTarget(email, request.getMemberId()).get("notes"));
        return target(canonical.setTarget(email, target));
    }

    public Map<String, Object> getTarget(String email, UUID memberId) {
        return target(canonical.getTarget(email, memberId));
    }

    public Map<String, Object> analyzeFood(String email, String input) {
        FoodCalculateRequest request = new FoodCalculateRequest();
        request.setFoodName(input); request.setQuantity(1.0); request.setUnit("serving");
        return canonical.calculateFood(email, request);
    }

    public Map<String, Object> logFood(String email, FoodEntryRequest request) {
        Map<String, Object> result;
        if (request.getCalories() == null) {
            FoodLogRequest input = new FoodLogRequest();
            input.setMemberId(request.getMemberId()); input.setFoodName(request.getRawInput());
            input.setQuantity(request.getQuantity() == null ? 1.0 : request.getQuantity());
            input.setUnit(request.getUnit() == null ? "serving" : request.getUnit());
            input.setMealType(request.getMealType() == null ? "SNACK" : request.getMealType());
            result = canonical.logFood(email, input);
        } else {
            FoodLogManualRequest input = new FoodLogManualRequest();
            input.setMemberId(request.getMemberId());
            input.setFoodName(request.getFoodName() == null ? request.getRawInput() : request.getFoodName());
            input.setFoodNameAr(request.getFoodNameAr()); input.setQuantity(request.getQuantity() == null ? 1.0 : request.getQuantity());
            input.setUnit(request.getUnit() == null ? "serving" : request.getUnit());
            input.setMealType(request.getMealType() == null ? "SNACK" : request.getMealType());
            input.setCalories(request.getCalories()); input.setProtein(orZero(request.getProteinG()));
            input.setCarbs(orZero(request.getCarbsG())); input.setFat(orZero(request.getFatG()));
            input.setFiber(request.getFiberG()); input.setSugar(request.getSugarG());
            result = canonical.logFoodManual(email, input);
        }
        return entry(map(result.get("entry")));
    }

    public Map<String, Object> getTodayLog(String email, UUID memberId) {
        return today(canonical.getTodayLog(email, memberId));
    }

    public List<Map<String, Object>> getHistory(String email, UUID memberId) {
        return canonical.getEntryHistory(email, memberId).stream().map(this::entry).toList();
    }

    public void deleteEntry(String email, UUID entryId) { canonical.deleteEntry(email, entryId); }

    public Map<String, Object> logWater(String email, WaterLogRequest request) {
        WaterAddRequest input = new WaterAddRequest();
        input.setMemberId(request.getMemberId()); input.setAmount(request.getAmountMl() / 1000.0);
        Map<String, Object> result = canonical.logWater(email, input);
        List<Map<String, Object>> logs = waterLogs(result.get("logs"));
        Map<String, Object> response = new LinkedHashMap<>(logs.isEmpty() ? Map.of() : logs.get(logs.size() - 1));
        response.put("totalTodayMl", Math.round(number(result.get("consumed")) * 1000));
        return response;
    }

    public Map<String, Object> getCoachOverview(String email, UUID memberId) {
        Map<String, Object> overview = canonical.getStaffMemberOverview(email, memberId);
        Map<String, Object> response = today(map(overview.get("today")));
        response.put("weeklyAdherence", overview.get("adherence7Days"));
        response.put("weeklyAvgCalories", overview.get("weeklyAvgCalories"));
        response.put("weeklyAvgProtein", overview.get("weeklyAvgProtein"));
        return response;
    }

    private Map<String, Object> today(Map<String, Object> input) {
        Map<String, Object> response = new LinkedHashMap<>();
        List<?> entries = (List<?>) input.getOrDefault("entries", List.of());
        response.put("entries", entries.stream().map(value -> entry(map(value))).toList());
        Map<String, Object> totals = new LinkedHashMap<>();
        Map<String, Object> canonicalTotals = map(input.get("totals"));
        for (String macro : List.of("calories", "protein", "carbs", "fat"))
            totals.put(macro, map(canonicalTotals.get(macro)).getOrDefault("consumed", 0));
        response.put("totals", totals);
        response.put("waterMl", input.getOrDefault("waterMl", 0));
        response.put("waterLogs", input.getOrDefault("waterLogs", List.of()));
        Map<String, Object> target = map(input.get("target"));
        response.put("hasTarget", !target.isEmpty());
        if (!target.isEmpty()) response.put("target", target(target));
        return response;
    }

    private Map<String, Object> target(Map<String, Object> input) {
        Map<String, Object> result = new LinkedHashMap<>(input);
        for (var pair : Map.of("targetCalories", "calories", "targetProtein", "proteinG",
                "targetCarbs", "carbsG", "targetFat", "fatG").entrySet())
            if (input.containsKey(pair.getKey())) result.put(pair.getValue(), input.get(pair.getKey()));
        if (input.containsKey("targetWater")) result.put("waterMl", input.get("targetWater") == null ? null : Math.round(number(input.get("targetWater")) * 1000));
        return result;
    }

    private Map<String, Object> entry(Map<String, Object> input) {
        Map<String, Object> result = new LinkedHashMap<>(input);
        for (String macro : List.of("protein", "carbs", "fat", "fiber", "sugar")) result.put(macro + "G", input.get(macro));
        return result;
    }

    private List<Map<String, Object>> waterLogs(Object input) {
        return ((List<?>) input).stream().map(value -> {
            Map<String, Object> result = new LinkedHashMap<>(map(value));
            result.put("amountMl", Math.round(number(result.get("amount")) * 1000));
            return result;
        }).toList();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> map(Object value) { return value instanceof Map ? (Map<String, Object>) value : Map.of(); }
    private double number(Object value) { return value instanceof Number number ? number.doubleValue() : 0; }
    private double orZero(Double value) { return value == null ? 0 : value; }
}
