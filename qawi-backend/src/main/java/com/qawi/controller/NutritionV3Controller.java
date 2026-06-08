package com.qawi.controller;

import com.qawi.dto.FoodAnalysisRequest;
import com.qawi.dto.FoodEntryRequest;
import com.qawi.dto.NutritionTargetRequest;
import com.qawi.dto.WaterLogRequest;
import com.qawi.service.NutritionV3Service;
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
@RequestMapping("/api/v1/nutrition/v3")
@RequiredArgsConstructor
public class NutritionV3Controller {

    private final NutritionV3Service nutritionV3Service;

    @PostMapping("/targets")
    @PreAuthorize("hasAnyRole('COACH','GYM_ADMIN')")
    public ResponseEntity<Map<String, Object>> setTarget(
            @Valid @RequestBody NutritionTargetRequest req,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(nutritionV3Service.setTarget(ud.getUsername(), req));
    }

    @GetMapping("/targets/{memberId}")
    public ResponseEntity<Map<String, Object>> getTarget(
            @PathVariable UUID memberId,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(nutritionV3Service.getTarget(ud.getUsername(), memberId));
    }

    @PutMapping("/targets/{memberId}")
    @PreAuthorize("hasAnyRole('COACH','GYM_ADMIN')")
    public ResponseEntity<Map<String, Object>> updateTarget(
            @PathVariable UUID memberId,
            @Valid @RequestBody NutritionTargetRequest req,
            @AuthenticationPrincipal UserDetails ud) {
        req.setMemberId(memberId);
        return ResponseEntity.ok(nutritionV3Service.setTarget(ud.getUsername(), req));
    }

    @PostMapping("/analyze")
    public ResponseEntity<Map<String, Object>> analyzeFood(
            @Valid @RequestBody FoodAnalysisRequest req) {
        return ResponseEntity.ok(nutritionV3Service.analyzeFood(req.getInput()));
    }

    @PostMapping("/log")
    public ResponseEntity<Map<String, Object>> logFood(
            @Valid @RequestBody FoodEntryRequest req,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(nutritionV3Service.logFood(ud.getUsername(), req));
    }

    @GetMapping("/log/today/{memberId}")
    public ResponseEntity<Map<String, Object>> getTodayLog(
            @PathVariable UUID memberId,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(nutritionV3Service.getTodayLog(ud.getUsername(), memberId));
    }

    @GetMapping("/log/history/{memberId}")
    public ResponseEntity<List<Map<String, Object>>> getHistory(
            @PathVariable UUID memberId,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(nutritionV3Service.getHistory(ud.getUsername(), memberId));
    }

    @DeleteMapping("/log/{entryId}")
    public ResponseEntity<Void> deleteEntry(
            @PathVariable UUID entryId,
            @AuthenticationPrincipal UserDetails ud) {
        nutritionV3Service.deleteEntry(ud.getUsername(), entryId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/water")
    public ResponseEntity<Map<String, Object>> logWater(
            @Valid @RequestBody WaterLogRequest req,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(nutritionV3Service.logWater(ud.getUsername(), req));
    }

    @GetMapping("/water/today/{memberId}")
    public ResponseEntity<?> getTodayWater(
            @PathVariable UUID memberId,
            @AuthenticationPrincipal UserDetails ud) {
        Map<String, Object> log = nutritionV3Service.getTodayLog(ud.getUsername(), memberId);
        return ResponseEntity.ok(Map.of("waterMl", log.get("waterMl"), "waterLogs", log.get("waterLogs")));
    }

    @GetMapping("/coach/overview/{memberId}")
    @PreAuthorize("hasAnyRole('COACH','GYM_ADMIN')")
    public ResponseEntity<Map<String, Object>> getCoachOverview(
            @PathVariable UUID memberId,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(nutritionV3Service.getCoachOverview(ud.getUsername(), memberId));
    }
}
