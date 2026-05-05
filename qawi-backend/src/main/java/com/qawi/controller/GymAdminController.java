package com.qawi.controller;

import com.qawi.dto.*;
import com.qawi.entity.*;
import com.qawi.service.GymAdminService;
import com.qawi.service.MemberReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('GYM_ADMIN')")
@RequiredArgsConstructor
public class GymAdminController {

    private final GymAdminService gymAdminService;
    private final MemberReportService memberReportService;

    @PostMapping("/coaches")
    public ResponseEntity<User> createCoach(
            @Valid @RequestBody CreateGymUserRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(gymAdminService.createCoach(request, userDetails.getUsername()));
    }

    @GetMapping("/coaches")
    public ResponseEntity<List<User>> getCoaches(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(gymAdminService.getCoaches(userDetails.getUsername()));
    }

    @GetMapping("/coaches/{coachId}/members")
    public ResponseEntity<List<User>> getCoachMembers(
            @PathVariable UUID coachId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(gymAdminService.getCoachMembers(coachId, userDetails.getUsername()));
    }

    @PostMapping("/members")
    public ResponseEntity<User> createMember(
            @Valid @RequestBody CreateGymUserRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(gymAdminService.createMember(request, userDetails.getUsername()));
    }

    @GetMapping("/members")
    public ResponseEntity<List<User>> getMembers(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(gymAdminService.getMembers(userDetails.getUsername()));
    }

    @PutMapping("/members/{memberId}/assign")
    public ResponseEntity<CoachMember> assignCoach(
            @PathVariable UUID memberId,
            @Valid @RequestBody AssignCoachRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(gymAdminService.assignCoach(memberId, request, userDetails.getUsername()));
    }

    @DeleteMapping("/users/{userId}")
    public ResponseEntity<Void> softDelete(
            @PathVariable UUID userId,
            @AuthenticationPrincipal UserDetails userDetails) {
        gymAdminService.softDelete(userId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/members/{memberId}/subscription")
    public ResponseEntity<Map<String, Object>> updateSubscription(
            @PathVariable UUID memberId,
            @Valid @RequestBody MemberSubscriptionRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(gymAdminService.updateMemberSubscription(memberId, request, userDetails.getUsername()));
    }

    @GetMapping("/members/{memberId}/subscription-history")
    public ResponseEntity<List<SubscriptionHistory>> getSubscriptionHistory(
            @PathVariable UUID memberId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(gymAdminService.getSubscriptionHistory(memberId, userDetails.getUsername()));
    }

    @GetMapping("/expiring-subscriptions")
    public ResponseEntity<List<User>> getExpiringSubscriptions(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(gymAdminService.getExpiringSubscriptions(userDetails.getUsername()));
    }

    @GetMapping("/analytics")
    public ResponseEntity<AdminAnalyticsResponse> getAnalytics(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(gymAdminService.getAnalytics(userDetails.getUsername()));
    }

    @GetMapping("/revenue-report")
    public ResponseEntity<Map<String, Object>> getRevenueReport(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @AuthenticationPrincipal UserDetails userDetails) {
        LocalDate start = startDate != null ? LocalDate.parse(startDate) : LocalDate.now().withDayOfMonth(1);
        LocalDate end = endDate != null ? LocalDate.parse(endDate) : LocalDate.now();
        return ResponseEntity.ok(gymAdminService.getRevenueReport(userDetails.getUsername(), start, end));
    }

    @GetMapping("/reports")
    public ResponseEntity<List<Map<String, Object>>> getMemberReports(@AuthenticationPrincipal UserDetails userDetails) {
        UUID gymId = gymAdminService.getGymIdForAdmin(userDetails.getUsername());
        return ResponseEntity.ok(memberReportService.getReportsForGym(gymId));
    }

    @PutMapping("/reports/{reportId}/resolve")
    public ResponseEntity<Void> resolveReport(
            @PathVariable UUID reportId,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID gymId = gymAdminService.getGymIdForAdmin(userDetails.getUsername());
        memberReportService.resolveReport(reportId, gymId);
        return ResponseEntity.noContent().build();
    }
}
