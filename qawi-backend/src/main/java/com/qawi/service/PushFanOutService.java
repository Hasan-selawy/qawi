package com.qawi.service;

import com.qawi.entity.NotificationType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Performs best-effort outbound push delivery (web + Expo) off the request
 * thread, on the {@code pushTaskExecutor} pool.
 *
 * <p>This lives in its own bean (rather than as an {@code @Async} method on
 * {@link NotificationService}) because Spring's {@code @Async} proxy is bypassed
 * on self-invocation — calling an {@code @Async} method from within the same
 * class would silently run synchronously.
 *
 * <p>Delivery is best-effort: failures are swallowed (logged at debug) so a push
 * outage never affects the in-app notification that already committed.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PushFanOutService {

    private final WebPushService webPushService;
    private final ExpoPushService expoPushService;

    @Async("pushTaskExecutor")
    public void fanOut(UUID userId, boolean browser, boolean mobile,
                       String title, String titleAr, String body, String bodyAr,
                       String actionUrl, NotificationType type) {
        if (browser) {
            try {
                webPushService.sendToUser(userId, title, titleAr, body, bodyAr, actionUrl, type);
            } catch (Exception e) {
                log.debug("Web push fan-out failed for user {}: {}", userId, e.toString());
            }
        }
        if (mobile) {
            try {
                expoPushService.sendToUser(userId, title, titleAr, body, bodyAr, actionUrl, type);
            } catch (Exception e) {
                log.debug("Mobile push fan-out failed for user {}: {}", userId, e.toString());
            }
        }
    }
}
