package com.qawi.service;

import com.qawi.dto.CreateMealRequest;
import com.qawi.dto.CreateNutritionPlanRequest;
import com.qawi.entity.*;
import com.qawi.exception.AppException;
import com.qawi.repository.MealRepository;
import com.qawi.repository.NutritionPlanRepository;
import com.qawi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class NutritionService {

    private final NutritionPlanRepository planRepository;
    private final MealRepository mealRepository;
    private final UserRepository userRepository;

    @Transactional
    public Map<String, Object> createPlan(CreateNutritionPlanRequest req, String coachEmail) {
        User coach = getUser(coachEmail);
        NutritionPlan plan = planRepository.save(NutritionPlan.builder()
                .memberId(req.getMemberId())
                .coachId(coach.getId())
                .build());
        return buildPlanDetail(plan);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getPlansByMember(UUID memberId) {
        return planRepository.findByMemberId(memberId).stream()
                .map(this::buildPlanDetail).toList();
    }

    @Transactional
    public Meal addMeal(UUID planId, CreateMealRequest req, String coachEmail) {
        planRepository.findById(planId)
                .orElseThrow(() -> new AppException("Plan not found", "الخطة غير موجودة", HttpStatus.NOT_FOUND));

        int idx = (int) mealRepository.countByNutritionPlanId(planId);
        return mealRepository.save(Meal.builder()
                .nutritionPlanId(planId)
                .mealType(req.getMealType())
                .description(req.getDescription())
                .descriptionAr(req.getDescriptionAr())
                .calories(req.getCalories())
                .protein(req.getProtein())
                .orderIndex(idx)
                .build());
    }

    @Transactional
    public Meal updateMeal(UUID mealId, CreateMealRequest req, String coachEmail) {
        Meal meal = mealRepository.findById(mealId)
                .orElseThrow(() -> new AppException("Meal not found", "الوجبة غير موجودة", HttpStatus.NOT_FOUND));
        meal.setMealType(req.getMealType());
        meal.setDescription(req.getDescription());
        meal.setDescriptionAr(req.getDescriptionAr());
        meal.setCalories(req.getCalories());
        meal.setProtein(req.getProtein());
        return mealRepository.save(meal);
    }

    @Transactional
    public void deleteMeal(UUID mealId, String coachEmail) {
        mealRepository.findById(mealId)
                .orElseThrow(() -> new AppException("Meal not found", "الوجبة غير موجودة", HttpStatus.NOT_FOUND));
        mealRepository.deleteById(mealId);
    }

    private Map<String, Object> buildPlanDetail(NutritionPlan plan) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", plan.getId());
        result.put("memberId", plan.getMemberId());
        result.put("coachId", plan.getCoachId());
        result.put("createdAt", plan.getCreatedAt());
        result.put("meals", mealRepository.findByNutritionPlanIdOrderByOrderIndex(plan.getId()));
        return result;
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));
    }
}
