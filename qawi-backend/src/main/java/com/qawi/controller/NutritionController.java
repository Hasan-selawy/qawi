package com.qawi.controller;

import com.qawi.dto.CreateMealRequest;
import com.qawi.dto.CreateNutritionPlanRequest;
import com.qawi.entity.Meal;
import com.qawi.service.GymFeatureService;
import com.qawi.service.NutritionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/nutrition/plans")
@RequiredArgsConstructor
public class NutritionController {

    private final NutritionService nutritionService;
    private final GymFeatureService gymFeatureService;

    private void assertNutritionEnabled(UserDetails ud) {
        gymFeatureService.assertEnabled(ud.getUsername(), GymFeatureService.Feature.NUTRITION);
    }

    @PostMapping
    @PreAuthorize("hasRole('COACH')")
    public ResponseEntity<Map<String, Object>> createPlan(
            @Valid @RequestBody CreateNutritionPlanRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        assertNutritionEnabled(userDetails);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(nutritionService.createPlan(request, userDetails.getUsername()));
    }

    @GetMapping("/member/{memberId}")
    public ResponseEntity<List<Map<String, Object>>> getPlansByMember(
            @PathVariable UUID memberId,
            @AuthenticationPrincipal UserDetails userDetails) {
        assertNutritionEnabled(userDetails);
        return ResponseEntity.ok(nutritionService.getPlansByMember(memberId, userDetails.getUsername()));
    }

    @PostMapping("/{planId}/meals")
    @PreAuthorize("hasRole('COACH')")
    public ResponseEntity<Meal> addMeal(
            @PathVariable UUID planId,
            @Valid @RequestBody CreateMealRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        assertNutritionEnabled(userDetails);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(nutritionService.addMeal(planId, request, userDetails.getUsername()));
    }

    @PutMapping("/meals/{mealId}")
    @PreAuthorize("hasRole('COACH')")
    public ResponseEntity<Meal> updateMeal(
            @PathVariable UUID mealId,
            @Valid @RequestBody CreateMealRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        assertNutritionEnabled(userDetails);
        return ResponseEntity.ok(nutritionService.updateMeal(mealId, request, userDetails.getUsername()));
    }

    @DeleteMapping("/{planId}")
    @PreAuthorize("hasRole('COACH')")
    public ResponseEntity<Void> deletePlan(
            @PathVariable UUID planId,
            @AuthenticationPrincipal UserDetails userDetails) {
        assertNutritionEnabled(userDetails);
        nutritionService.deletePlan(planId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/meals/{mealId}")
    @PreAuthorize("hasRole('COACH')")
    public ResponseEntity<Void> deleteMeal(
            @PathVariable UUID mealId,
            @AuthenticationPrincipal UserDetails userDetails) {
        assertNutritionEnabled(userDetails);
        nutritionService.deleteMeal(mealId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }
}
