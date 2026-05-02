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

    @PutMapping("/gyms/{gymId}/subscription")
    public ResponseEntity<GymDetailResponse> updateSubscription(
            @PathVariable UUID gymId,
            @Valid @RequestBody UpdateSubscriptionRequest request) {
        return ResponseEntity.ok(superAdminService.updateSubscription(gymId, request));
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
}
