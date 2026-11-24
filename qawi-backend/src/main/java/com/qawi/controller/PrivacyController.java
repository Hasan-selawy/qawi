package com.qawi.controller;

import com.qawi.entity.BiometricErasureJob;
import com.qawi.service.PrivacyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/v1/privacy")
@RequiredArgsConstructor
public class PrivacyController {
    private final PrivacyService privacy;
    public record DeleteRequest(boolean measurements, boolean biometrics) {}
    public record ConfirmRequest(boolean confirmed) {}

    @GetMapping("/me") @PreAuthorize("hasRole('MEMBER')")
    public ResponseEntity<Map<String, Object>> exportSelf(@AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok().header("Cache-Control", "no-store")
                .header("Content-Disposition", "attachment; filename=qawi-sensitive-data.json")
                .body(privacy.exportSelf(principal.getUsername()));
    }

    @DeleteMapping("/me") @PreAuthorize("hasRole('MEMBER')")
    public Map<String, Object> deleteSelf(@AuthenticationPrincipal UserDetails principal, @RequestBody DeleteRequest request) {
        return privacy.deleteSelf(principal.getUsername(), request.measurements(), request.biometrics());
    }

    @GetMapping("/device-erasures") @PreAuthorize("hasRole('GYM_ADMIN')")
    public ResponseEntity<List<BiometricErasureJob>> pending(@AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok().header("Cache-Control", "no-store").body(privacy.pendingDeviceErasures(principal.getUsername()));
    }

    @PostMapping("/device-erasures/{id}/confirm") @PreAuthorize("hasRole('GYM_ADMIN')")
    public ResponseEntity<Void> confirm(@AuthenticationPrincipal UserDetails principal, @PathVariable UUID id,
                                        @RequestBody ConfirmRequest request) {
        privacy.confirmDeviceErasure(principal.getUsername(), id, request.confirmed());
        return ResponseEntity.noContent().build();
    }
}
