package com.qawi.controller;

import com.qawi.dto.NotificationPreferenceRequest;
import com.qawi.dto.RegisterMobileTokenRequest;
import com.qawi.dto.RegisterWebPushRequest;
import com.qawi.entity.MobilePushToken;
import com.qawi.entity.Notification;
import com.qawi.entity.NotificationCategory;
import com.qawi.entity.NotificationPreference;
import com.qawi.entity.PushSubscription;
import com.qawi.entity.User;
import com.qawi.exception.AppException;
import com.qawi.repository.UserRepository;
import com.qawi.service.NotificationPreferenceService;
import com.qawi.service.NotificationService;
import com.qawi.service.PushRegistrationService;
import com.qawi.service.WebPushService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final NotificationPreferenceService preferenceService;
    private final PushRegistrationService pushRegistrationService;
    private final WebPushService webPushService;
    private final UserRepository userRepository;

    /** Full non-archived feed (newest first). Back-compatible array response. */
    @GetMapping
    public ResponseEntity<List<Notification>> getMyNotifications(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(notificationService.getForUser(currentUser(userDetails).getId()));
    }

    /** Paginated + filterable feed for richer clients. */
    @GetMapping("/page")
    public ResponseEntity<Page<Notification>> getPaged(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "false") boolean unreadOnly,
            @RequestParam(required = false) NotificationCategory category) {
        int safeSize = Math.min(Math.max(size, 1), 100);
        int safePage = Math.max(page, 0);
        Page<Notification> result = notificationService.getPage(
                currentUser(userDetails).getId(), unreadOnly, category, PageRequest.of(safePage, safeSize));
        return ResponseEntity.ok(result);
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> unreadCount(
            @AuthenticationPrincipal UserDetails userDetails) {
        long count = notificationService.unreadCount(currentUser(userDetails).getId());
        return ResponseEntity.ok(Map.of("count", count));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Notification> markRead(
            @PathVariable UUID id, @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(notificationService.markRead(id, currentUser(userDetails).getId()));
    }

    /** PATCH alias for marking a single notification read. */
    @PatchMapping("/{id}/read")
    public ResponseEntity<Notification> markReadPatch(
            @PathVariable UUID id, @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(notificationService.markRead(id, currentUser(userDetails).getId()));
    }

    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllRead(@AuthenticationPrincipal UserDetails userDetails) {
        notificationService.markAllRead(currentUser(userDetails).getId());
        return ResponseEntity.noContent().build();
    }

    /** PATCH alias for marking all notifications read. */
    @PatchMapping("/read-all")
    public ResponseEntity<Void> markAllReadPatch(@AuthenticationPrincipal UserDetails userDetails) {
        notificationService.markAllRead(currentUser(userDetails).getId());
        return ResponseEntity.noContent().build();
    }

    /** Soft-deletes (archives) a notification from the user's feed. */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> archive(
            @PathVariable UUID id, @AuthenticationPrincipal UserDetails userDetails) {
        notificationService.archive(id, currentUser(userDetails).getId());
        return ResponseEntity.noContent().build();
    }

    // ── Per-user preferences ──────────────────────────────────────────────

    @GetMapping("/preferences")
    public ResponseEntity<NotificationPreference> getPreferences(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(preferenceService.getOrCreate(currentUser(userDetails).getId()));
    }

    @PutMapping("/preferences")
    public ResponseEntity<NotificationPreference> updatePreferences(
            @Valid @RequestBody NotificationPreferenceRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(preferenceService.update(currentUser(userDetails).getId(), req));
    }

    // ── Push target registration ──────────────────────────────────────────

    /** Register / refresh this browser's Web Push subscription. */
    @PostMapping("/push/web")
    public ResponseEntity<PushSubscription> registerWebPush(
            @Valid @RequestBody RegisterWebPushRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(pushRegistrationService.registerWeb(currentUser(userDetails), req));
    }

    @DeleteMapping("/push/web")
    public ResponseEntity<Void> removeWebPush(
            @RequestParam String endpoint, @AuthenticationPrincipal UserDetails userDetails) {
        pushRegistrationService.removeWeb(currentUser(userDetails).getId(), endpoint);
        return ResponseEntity.noContent().build();
    }

    /** Register / refresh this device's Expo push token. */
    @PostMapping("/push/mobile")
    public ResponseEntity<MobilePushToken> registerMobilePush(
            @Valid @RequestBody RegisterMobileTokenRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(pushRegistrationService.registerMobile(currentUser(userDetails), req));
    }

    @DeleteMapping("/push/mobile")
    public ResponseEntity<Void> removeMobilePush(
            @RequestParam String token, @AuthenticationPrincipal UserDetails userDetails) {
        pushRegistrationService.removeMobile(currentUser(userDetails).getId(), token);
        return ResponseEntity.noContent().build();
    }

    /**
     * VAPID public key browsers need to create a Web Push subscription.
     * Returns {@code {"publicKey": null}} when web push is not configured on the
     * server, so clients can cleanly skip browser push.
     */
    @GetMapping("/vapid-public-key")
    public ResponseEntity<Map<String, String>> vapidPublicKey() {
        Map<String, String> body = new HashMap<>();
        body.put("publicKey", webPushService.isConfigured() ? webPushService.getPublicKey() : null);
        return ResponseEntity.ok(body);
    }

    private User currentUser(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));
    }
}
