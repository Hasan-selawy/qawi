package com.qawi.gym.controller;

import com.qawi.gym.dto.response.ApiResponse;
import com.qawi.gym.dto.response.DashboardResponse;
import com.qawi.gym.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/gym/{gymId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'GYM_OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<DashboardResponse>> getGymDashboard(@PathVariable Long gymId) {
        return ResponseEntity.ok(ApiResponse.success(dashboardService.getGymDashboard(gymId)));
    }
}
