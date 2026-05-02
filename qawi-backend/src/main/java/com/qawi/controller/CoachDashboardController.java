package com.qawi.controller;

import com.qawi.dto.CoachMemberSummary;
import com.qawi.service.CoachDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/coach")
@PreAuthorize("hasRole('COACH')")
@RequiredArgsConstructor
public class CoachDashboardController {

    private final CoachDashboardService coachDashboardService;

    @GetMapping("/members")
    public ResponseEntity<List<CoachMemberSummary>> getMyMembers(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(coachDashboardService.getMyMembers(userDetails.getUsername()));
    }

    @GetMapping("/members/{memberId}/overview")
    public ResponseEntity<Map<String, Object>> getMemberOverview(
            @PathVariable UUID memberId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(coachDashboardService.getMemberOverview(memberId, userDetails.getUsername()));
    }
}
