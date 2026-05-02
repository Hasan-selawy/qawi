package com.qawi.gym.controller;

import com.qawi.gym.dto.request.MembershipPlanRequest;
import com.qawi.gym.dto.response.ApiResponse;
import com.qawi.gym.dto.response.MembershipPlanResponse;
import com.qawi.gym.service.MembershipPlanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/gyms/{gymId}/plans")
@RequiredArgsConstructor
public class MembershipPlanController {

    private final MembershipPlanService planService;

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'GYM_OWNER')")
    public ResponseEntity<ApiResponse<MembershipPlanResponse>> createPlan(
            @PathVariable Long gymId,
            @Valid @RequestBody MembershipPlanRequest request) {
        MembershipPlanResponse response = planService.createPlan(gymId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Plan created", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<MembershipPlanResponse>>> getPlans(
            @PathVariable Long gymId,
            @RequestParam(required = false) Boolean activeOnly) {
        return ResponseEntity.ok(ApiResponse.success(planService.getPlansByGym(gymId, activeOnly)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<MembershipPlanResponse>> getPlan(@PathVariable Long gymId, @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(planService.getPlan(id)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'GYM_OWNER')")
    public ResponseEntity<ApiResponse<MembershipPlanResponse>> updatePlan(
            @PathVariable Long gymId,
            @PathVariable Long id,
            @Valid @RequestBody MembershipPlanRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Plan updated", planService.updatePlan(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'GYM_OWNER')")
    public ResponseEntity<ApiResponse<Void>> deletePlan(@PathVariable Long gymId, @PathVariable Long id) {
        planService.deletePlan(id);
        return ResponseEntity.ok(ApiResponse.success("Plan deleted", null));
    }
}
