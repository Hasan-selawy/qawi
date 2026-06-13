package com.qawi.controller;

import com.qawi.dto.*;
import com.qawi.entity.*;
import com.qawi.service.GymAdminService;
import com.qawi.service.GymFeatureService;
import com.qawi.service.GymMemberPlanService;
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
    private final GymFeatureService gymFeatureService;
    private final MemberReportService memberReportService;
    private final GymMemberPlanService gymMemberPlanService;
    private final com.qawi.repository.GymExerciseOverrideRepository gymExerciseOverrideRepository;
    private final com.qawi.repository.ExerciseTemplateRepository exerciseTemplateRepository;

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

    // Spring Security 6: a method-level @PreAuthorize REPLACES the class-level one (does not stack).
    // Therefore SUPER_ADMIN is allowed here even though the class has @PreAuthorize("hasRole('GYM_ADMIN')").
    @PatchMapping("/members/{memberId}/self-training")
    @PreAuthorize("hasRole('GYM_ADMIN') or hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> toggleSelfTraining(
            @PathVariable UUID memberId,
            @RequestBody java.util.Map<String, Boolean> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        boolean enabled = Boolean.TRUE.equals(body.get("enabled"));
        gymAdminService.toggleSelfTraining(memberId, enabled, userDetails.getUsername());
        return ResponseEntity.noContent().build();
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
        gymFeatureService.assertEnabled(userDetails.getUsername(), GymFeatureService.Feature.ANALYTICS_ADVANCED);
        LocalDate start = startDate != null ? LocalDate.parse(startDate) : LocalDate.now().withDayOfMonth(1);
        LocalDate end = endDate != null ? LocalDate.parse(endDate) : LocalDate.now();
        return ResponseEntity.ok(gymAdminService.getRevenueReport(userDetails.getUsername(), start, end));
    }

    @GetMapping("/reports")
    public ResponseEntity<List<Map<String, Object>>> getMemberReports(@AuthenticationPrincipal UserDetails userDetails) {
        UUID gymId = gymAdminService.getGymIdForAdmin(userDetails.getUsername());
        return ResponseEntity.ok(memberReportService.getReportsForGym(gymId));
    }

    @PutMapping("/users/{userId}/reset-password")
    public ResponseEntity<Void> resetPassword(
            @PathVariable UUID userId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        String newPassword = body.get("newPassword");
        if (newPassword == null || newPassword.length() < 8) {
            throw new com.qawi.exception.AppException(
                    "Password must be at least 8 characters",
                    "كلمة المرور يجب أن تكون 8 أحرف على الأقل",
                    org.springframework.http.HttpStatus.BAD_REQUEST);
        }
        gymAdminService.resetPassword(userId, newPassword, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/reports/{reportId}/resolve")
    public ResponseEntity<Void> resolveReport(
            @PathVariable UUID reportId,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID gymId = gymAdminService.getGymIdForAdmin(userDetails.getUsername());
        memberReportService.resolveReport(reportId, gymId);
        return ResponseEntity.noContent().build();
    }

    // ── EXERCISE OVERRIDES ────────────────────────────────────────────────────

    @GetMapping("/exercises/overrides")
    public ResponseEntity<List<com.qawi.entity.GymExerciseOverride>> getOverrides(
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID gymId = gymAdminService.getGymIdForAdmin(userDetails.getUsername());
        return ResponseEntity.ok(gymExerciseOverrideRepository.findByGymId(gymId));
    }

    @PutMapping("/exercises/{exerciseId}/override")
    public ResponseEntity<com.qawi.entity.GymExerciseOverride> upsertOverride(
            @PathVariable UUID exerciseId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID gymId = gymAdminService.getGymIdForAdmin(userDetails.getUsername());
        exerciseTemplateRepository.findById(exerciseId)
                .orElseThrow(() -> new com.qawi.exception.AppException(
                        "Exercise not found", "التمرين غير موجود", org.springframework.http.HttpStatus.NOT_FOUND));
        com.qawi.entity.GymExerciseOverride override = gymExerciseOverrideRepository
                .findByGymIdAndExerciseTemplateId(gymId, exerciseId)
                .orElse(com.qawi.entity.GymExerciseOverride.builder()
                        .gymId(gymId).exerciseTemplateId(exerciseId).build());
        if (body.containsKey("name") && body.get("name") != null) override.setName(body.get("name"));
        if (body.containsKey("nameAr") && body.get("nameAr") != null) override.setNameAr(body.get("nameAr"));
        if (body.containsKey("videoUrl")) override.setVideoUrl(body.get("videoUrl"));
        override.setUpdatedAt(java.time.LocalDateTime.now());
        if (override.getName() == null) {
            exerciseTemplateRepository.findById(exerciseId).ifPresent(t -> {
                if (override.getName() == null) override.setName(t.getName());
                if (override.getNameAr() == null) override.setNameAr(t.getNameAr());
            });
        }
        return ResponseEntity.ok(gymExerciseOverrideRepository.save(override));
    }

    @DeleteMapping("/exercises/{exerciseId}/override")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<Void> deleteOverride(
            @PathVariable UUID exerciseId,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID gymId = gymAdminService.getGymIdForAdmin(userDetails.getUsername());
        gymExerciseOverrideRepository.deleteByGymIdAndExerciseTemplateId(gymId, exerciseId);
        return ResponseEntity.noContent().build();
    }

    // ── GYM MEMBER PLANS ────────────────────────────────────────────────────

    @GetMapping("/member-plans")
    public ResponseEntity<List<GymMemberPlanDto>> getMemberPlans(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(gymMemberPlanService.getPlansForAdmin(userDetails.getUsername()));
    }

    @PostMapping("/member-plans")
    public ResponseEntity<GymMemberPlanDto> createMemberPlan(
            @RequestBody GymMemberPlanRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(gymMemberPlanService.createPlan(request, userDetails.getUsername()));
    }

    @PutMapping("/member-plans/{planId}")
    public ResponseEntity<GymMemberPlanDto> updateMemberPlan(
            @PathVariable UUID planId,
            @RequestBody GymMemberPlanRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(gymMemberPlanService.updatePlan(planId, request, userDetails.getUsername()));
    }

    @DeleteMapping("/member-plans/{planId}")
    public ResponseEntity<Void> deleteMemberPlan(
            @PathVariable UUID planId,
            @AuthenticationPrincipal UserDetails userDetails) {
        gymMemberPlanService.deletePlan(planId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/renewal-requests")
    public ResponseEntity<List<RenewalRequestDto>> getRenewalRequests(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(gymMemberPlanService.getRenewalRequests(userDetails.getUsername()));
    }

    @PutMapping("/renewal-requests/{requestId}/status")
    public ResponseEntity<RenewalRequestDto> updateRenewalStatus(
            @PathVariable UUID requestId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(gymMemberPlanService.updateRenewalStatus(
                requestId, body.get("status"), userDetails.getUsername()));
    }
}
