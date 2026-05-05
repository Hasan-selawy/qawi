package com.qawi.controller;

import com.qawi.dto.*;
import com.qawi.service.SuperAdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/super")
@PreAuthorize("hasRole('SUPER_ADMIN')")
@RequiredArgsConstructor
public class SuperAdminController {

    private final SuperAdminService superAdminService;

    @PostMapping("/gyms")
    public ResponseEntity<CreateGymResponse> createGym(@Valid @RequestBody CreateGymRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(superAdminService.createGym(request));
    }

    @GetMapping("/gyms")
    public ResponseEntity<List<GymDetailResponse>> getAllGyms() {
        return ResponseEntity.ok(superAdminService.getAllGyms());
    }

    @GetMapping("/gyms/{gymId}")
    public ResponseEntity<GymDetailResponse> getGym(@PathVariable UUID gymId) {
        return ResponseEntity.ok(superAdminService.getGym(gymId));
    }

    @PutMapping("/gyms/{gymId}/subscription")
    public ResponseEntity<GymDetailResponse> updateSubscription(
            @PathVariable UUID gymId,
            @Valid @RequestBody UpdateSubscriptionRequest request) {
        return ResponseEntity.ok(superAdminService.updateSubscription(gymId, request));
    }

    @PutMapping("/gyms/{gymId}/features")
    public ResponseEntity<GymDetailResponse> updateFeatures(
            @PathVariable UUID gymId,
            @Valid @RequestBody GymFeaturesRequest request) {
        return ResponseEntity.ok(superAdminService.updateFeatures(gymId, request));
    }

    @PutMapping("/gyms/{gymId}/limits")
    public ResponseEntity<GymDetailResponse> updateLimits(
            @PathVariable UUID gymId,
            @Valid @RequestBody GymLimitsRequest request) {
        return ResponseEntity.ok(superAdminService.updateLimits(gymId, request));
    }

    @PutMapping("/gyms/{gymId}/branding")
    public ResponseEntity<GymDetailResponse> updateBranding(
            @PathVariable UUID gymId,
            @Valid @RequestBody GymBrandingRequest request) {
        return ResponseEntity.ok(superAdminService.updateBranding(gymId, request));
    }

    @DeleteMapping("/gyms/{gymId}")
    public ResponseEntity<Void> deactivateGym(@PathVariable UUID gymId) {
        superAdminService.deactivateGym(gymId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/stats")
    public ResponseEntity<PlatformStatsResponse> getStats() {
        return ResponseEntity.ok(superAdminService.getStats());
    }

    @GetMapping("/leads")
    public ResponseEntity<List<ContactRequestDto>> getLeads(@RequestParam(required = false) String filter) {
        return ResponseEntity.ok(superAdminService.getLeads(filter));
    }

    @PutMapping("/leads/{id}/contacted")
    public ResponseEntity<MarkContactedResponse> markContacted(@PathVariable UUID id) {
        return ResponseEntity.ok(superAdminService.markContacted(id));
    }

    @PutMapping("/users/{userId}/reset-password")
    public ResponseEntity<Void> resetPassword(
            @PathVariable UUID userId,
            @RequestBody java.util.Map<String, String> body) {
        String newPassword = body.get("newPassword");
        if (newPassword == null || newPassword.length() < 8) {
            throw new com.qawi.exception.AppException(
                    "Password must be at least 8 characters",
                    "كلمة المرور يجب أن تكون 8 أحرف على الأقل",
                    org.springframework.http.HttpStatus.BAD_REQUEST);
        }
        superAdminService.resetPassword(userId, newPassword);
        return ResponseEntity.noContent().build();
    }
}
