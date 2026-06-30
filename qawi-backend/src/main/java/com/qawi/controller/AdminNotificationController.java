package com.qawi.controller;

import com.qawi.dto.NotificationSettingRequest;
import com.qawi.dto.ScheduleNotificationRequest;
import com.qawi.dto.SendNotificationRequest;
import com.qawi.entity.AudienceSegment;
import com.qawi.entity.NotificationSetting;
import com.qawi.entity.ScheduledNotification;
import com.qawi.service.AdminNotificationService;
import com.qawi.service.GymFeatureService;
import com.qawi.service.NotificationSettingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Gym-admin notification management: manual broadcasts, scheduling, audience
 * sizing, and per-gym automatic-notification settings. All operations are
 * scoped to the caller's gym by the underlying services.
 */
@RestController
@RequestMapping("/api/v1/admin/notifications")
@PreAuthorize("hasRole('GYM_ADMIN')")
@RequiredArgsConstructor
public class AdminNotificationController {

    private final AdminNotificationService adminNotificationService;
    private final NotificationSettingService notificationSettingService;
    private final GymFeatureService gymFeatureService;

    /** Send an immediate broadcast to a gym audience. Returns the recipient count. */
    @PostMapping("/send")
    public ResponseEntity<Map<String, Object>> send(
            @Valid @RequestBody SendNotificationRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {
        int count = adminNotificationService.send(userDetails.getUsername(), req);
        return ResponseEntity.ok(Map.of("delivered", count));
    }

    @PostMapping("/schedule")
    public ResponseEntity<ScheduledNotification> schedule(
            @Valid @RequestBody ScheduleNotificationRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(adminNotificationService.schedule(userDetails.getUsername(), req));
    }

    @GetMapping("/scheduled")
    public ResponseEntity<List<ScheduledNotification>> listScheduled(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(adminNotificationService.listScheduled(userDetails.getUsername()));
    }

    @DeleteMapping("/scheduled/{id}")
    public ResponseEntity<Void> cancelScheduled(
            @PathVariable UUID id, @AuthenticationPrincipal UserDetails userDetails) {
        adminNotificationService.cancelScheduled(userDetails.getUsername(), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/audience-count")
    public ResponseEntity<Map<String, Object>> audienceCount(
            @RequestParam AudienceSegment audience,
            @RequestParam(required = false) UUID targetUserId,
            @AuthenticationPrincipal UserDetails userDetails) {
        int count = adminNotificationService.audienceCount(userDetails.getUsername(), audience, targetUserId);
        return ResponseEntity.ok(Map.of("audience", audience.name(), "count", count));
    }

    // ── Per-gym settings ──────────────────────────────────────────────────

    @GetMapping("/settings")
    public ResponseEntity<NotificationSetting> getSettings(
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID gymId = requireGymId(userDetails);
        return ResponseEntity.ok(notificationSettingService.getOrCreate(gymId));
    }

    @PutMapping("/settings")
    public ResponseEntity<NotificationSetting> updateSettings(
            @Valid @RequestBody NotificationSettingRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID gymId = requireGymId(userDetails);
        return ResponseEntity.ok(notificationSettingService.update(gymId, req));
    }

    private UUID requireGymId(UserDetails userDetails) {
        UUID gymId = gymFeatureService.getUser(userDetails.getUsername()).getGymId();
        if (gymId == null) {
            throw new com.qawi.exception.AppException(
                    "Your account is not associated with a gym",
                    "حسابك غير مرتبط بصالة", HttpStatus.BAD_REQUEST);
        }
        return gymId;
    }
}
