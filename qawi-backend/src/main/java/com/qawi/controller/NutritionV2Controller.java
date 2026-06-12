package com.qawi.controller;

import com.qawi.dto.*;
import com.qawi.service.NutritionV2Service;
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
@RequestMapping("/api/v1/nutrition")
@RequiredArgsConstructor
public class NutritionV2Controller {

    private final NutritionV2Service svc;

    // ── Targets ──────────────────────────────────────────────

    @PostMapping("/targets")
    @PreAuthorize("hasAnyRole('COACH','NUTRITIONIST','GYM_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> setTarget(
            @Valid @RequestBody NutritionTargetSetRequest req,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.status(HttpStatus.CREATED).body(svc.setTarget(ud.getUsername(), req));
    }

    @GetMapping("/targets/{memberId}")
    public ResponseEntity<Map<String, Object>> getTarget(
            @PathVariable UUID memberId,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(svc.getTarget(ud.getUsername(), memberId));
    }

    @PutMapping("/targets/{memberId}")
    @PreAuthorize("hasAnyRole('COACH','NUTRITIONIST','GYM_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> updateTarget(
            @PathVariable UUID memberId,
            @Valid @RequestBody NutritionTargetSetRequest req,
            @AuthenticationPrincipal UserDetails ud) {
        req.setMemberId(memberId);
        return ResponseEntity.ok(svc.setTarget(ud.getUsername(), req));
    }

    // ── Food Search (cache-only, no AI) ───────────────────────

    @GetMapping("/search")
    public ResponseEntity<List<Map<String, Object>>> searchFood(
            @RequestParam String q) {
        return ResponseEntity.ok(svc.searchFood(q));
    }

    // ── Calculate (cache-first, AI fallback, no entry saved) ──

    @PostMapping("/calculate")
    public ResponseEntity<Map<String, Object>> calculateFood(
            @Valid @RequestBody FoodCalculateRequest req,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(svc.calculateFood(ud.getUsername(), req));
    }

    // ── Log Food (AI-assisted) ────────────────────────────────

    @PostMapping("/log")
    public ResponseEntity<Map<String, Object>> logFood(
            @Valid @RequestBody FoodLogRequest req,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.status(HttpStatus.CREATED).body(svc.logFood(ud.getUsername(), req));
    }

    @PostMapping("/log/manual")
    public ResponseEntity<Map<String, Object>> logFoodManual(
            @Valid @RequestBody FoodLogManualRequest req,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.status(HttpStatus.CREATED).body(svc.logFoodManual(ud.getUsername(), req));
    }

    @PutMapping("/log/{entryId}")
    public ResponseEntity<Map<String, Object>> updateEntry(
            @PathVariable UUID entryId,
            @Valid @RequestBody FoodLogRequest req,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(svc.updateEntry(ud.getUsername(), entryId, req));
    }

    @DeleteMapping("/log/{entryId}")
    public ResponseEntity<Void> deleteEntry(
            @PathVariable UUID entryId,
            @AuthenticationPrincipal UserDetails ud) {
        svc.deleteEntry(ud.getUsername(), entryId);
        return ResponseEntity.noContent().build();
    }

    // ── Today Log ─────────────────────────────────────────────

    @GetMapping("/log/today/{memberId}")
    public ResponseEntity<Map<String, Object>> getTodayLog(
            @PathVariable UUID memberId,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(svc.getTodayLog(ud.getUsername(), memberId));
    }

    // ── History ───────────────────────────────────────────────

    @GetMapping("/log/history/{memberId}")
    public ResponseEntity<List<Map<String, Object>>> getHistory(
            @PathVariable UUID memberId,
            @RequestParam(defaultValue = "7") int days,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(svc.getHistory(ud.getUsername(), memberId, days));
    }

    // ── Water ─────────────────────────────────────────────────

    @PostMapping("/water")
    public ResponseEntity<Map<String, Object>> logWater(
            @Valid @RequestBody WaterAddRequest req,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.status(HttpStatus.CREATED).body(svc.logWater(ud.getUsername(), req));
    }

    @GetMapping("/water/today/{memberId}")
    public ResponseEntity<Map<String, Object>> getTodayWater(
            @PathVariable UUID memberId,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(svc.getTodayWater(ud.getUsername(), memberId));
    }

    // ── Meal Suggestions ──────────────────────────────────────

    @PostMapping("/suggestions")
    @PreAuthorize("hasAnyRole('COACH','NUTRITIONIST','GYM_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> createSuggestion(
            @Valid @RequestBody MealSuggestionRequest req,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.status(HttpStatus.CREATED).body(svc.createSuggestion(ud.getUsername(), req));
    }

    @GetMapping("/suggestions/{memberId}")
    public ResponseEntity<List<Map<String, Object>>> getSuggestions(
            @PathVariable UUID memberId,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(svc.getSuggestions(ud.getUsername(), memberId));
    }

    @DeleteMapping("/suggestions/{id}")
    @PreAuthorize("hasAnyRole('COACH','NUTRITIONIST','GYM_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<Void> deleteSuggestion(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails ud) {
        svc.deleteSuggestion(ud.getUsername(), id);
        return ResponseEntity.noContent().build();
    }

    // ── Recent Foods ──────────────────────────────────────────

    @GetMapping("/recent-foods")
    public ResponseEntity<List<Map<String, Object>>> getRecentFoods(
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(svc.getRecentFoods(ud.getUsername()));
    }

    // ── Staff: member list + overview ─────────────────────────

    @GetMapping("/staff/members")
    @PreAuthorize("hasAnyRole('COACH','NUTRITIONIST','GYM_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getStaffMemberList(
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(svc.getStaffMemberList(ud.getUsername()));
    }

    @GetMapping("/staff/overview/{memberId}")
    @PreAuthorize("hasAnyRole('COACH','NUTRITIONIST','GYM_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> getStaffMemberOverview(
            @PathVariable UUID memberId,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(svc.getStaffMemberOverview(ud.getUsername(), memberId));
    }
}
