package com.qawi.controller;

import com.qawi.dto.*;
import com.qawi.service.PlatformTierService;
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
    private final PlatformTierService platformTierService;

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

    // ── PLATFORM PRICING ────────────────────────────────────────────────────

    @GetMapping("/platform-tiers")
    public ResponseEntity<List<PlatformTierDto>> getAllTiers() {
        return ResponseEntity.ok(platformTierService.getAllTiers());
    }

    @PostMapping("/platform-tiers")
    public ResponseEntity<PlatformTierDto> createTier(@RequestBody PlatformTierRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(platformTierService.createTier(request));
    }

    @PutMapping("/platform-tiers/{id}")
    public ResponseEntity<PlatformTierDto> updateTier(
            @PathVariable UUID id,
            @RequestBody PlatformTierRequest request) {
        return ResponseEntity.ok(platformTierService.updateTier(id, request));
    }

    @DeleteMapping("/platform-tiers/{id}")
    public ResponseEntity<Void> deactivateTier(@PathVariable UUID id) {
        platformTierService.deactivateTier(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/platform-page")
    public ResponseEntity<PlatformPageDto> getPage() {
        return ResponseEntity.ok(platformTierService.getPage());
    }

    @PutMapping("/platform-page")
    public ResponseEntity<PlatformPageDto> updatePage(@RequestBody PlatformPageDto request) {
        return ResponseEntity.ok(platformTierService.updatePage(request));
    }
}
