package com.qawi.controller;

import com.qawi.dto.GymLeadSummaryResponse;
import com.qawi.dto.MemberLeadPageResponse;
import com.qawi.service.SuperAdminLeadsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Super Admin "Leads" — gym directory + member drill-down.
 * Distinct from {@link SuperAdminSalesController} (platform sales pipeline) which
 * owns the literal sub-paths under the same prefix; this controller only adds
 * the collision-free /gyms and /gyms/{gymId}/members paths.
 */
@RestController
@RequestMapping("/api/v1/super/leads")
@PreAuthorize("hasRole('SUPER_ADMIN')")
@RequiredArgsConstructor
public class SuperAdminLeadsController {

    private final SuperAdminLeadsService superAdminLeadsService;

    @GetMapping("/gyms")
    public ResponseEntity<List<GymLeadSummaryResponse>> getGyms(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String sort) {
        return ResponseEntity.ok(superAdminLeadsService.getGymLeads(search, sort));
    }

    @GetMapping("/gyms/{gymId}/members")
    public ResponseEntity<MemberLeadPageResponse> getGymMembers(
            @PathVariable UUID gymId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(superAdminLeadsService.getGymMembers(gymId, search, status, page, size));
    }
}
