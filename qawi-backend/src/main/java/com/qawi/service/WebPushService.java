package com.qawi.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qawi.entity.NotificationType;
import com.qawi.entity.PushSubscription;
import com.qawi.repository.PushSubscriptionRepository;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.apache.http.HttpResponse;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.Security;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Best-effort browser Web Push delivery using the VAPID protocol.
 *
 * <p>Configuration is read from the environment ({@code VAPID_PUBLIC_KEY},
 * {@code VAPID_PRIVATE_KEY}, {@code VAPID_SUBJECT}). When the keys are absent the
 * service is a no-op so the rest of the notification pipeline keeps working — the
 * in-app feed and Expo push are unaffected. Subscriptions that the push endpoint
 * reports as gone (HTTP 404/410) are deactivated so we stop retrying them.
 */
@Service
public class WebPushService {

    private static final Logger log = LoggerFactory.getLogger(WebPushService.class);

    private final PushSubscriptionRepository pushSubscriptionRepository;
    private final ObjectMapper objectMapper;

    private PushService pushService;
    private String publicKey;
    private boolean configured;

    public WebPushService(PushSubscriptionRepository pushSubscriptionRepository,
                          ObjectMapper objectMapper,
                          @Value("${VAPID_PUBLIC_KEY:}") String publicKey,
                          @Value("${VAPID_PRIVATE_KEY:}") String privateKey,
                          @Value("${VAPID_SUBJECT:mailto:admin@qawi.com}") String subject) {
        this.pushSubscriptionRepository = pushSubscriptionRepository;
        this.objectMapper = objectMapper;

        if (publicKey != null && !publicKey.isBlank() && privateKey != null && !privateKey.isBlank()) {
            try {
                if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
                    Security.addProvider(new BouncyCastleProvider());
                }
                this.pushService = new PushService(publicKey.trim(), privateKey.trim(), subject);
                this.publicKey = publicKey.trim();
                this.configured = true;
                log.info("Web Push enabled (VAPID configured).");
            } catch (Exception e) {
                log.warn("Web Push disabled: failed to initialise PushService: {}", e.getMessage());
            }
        } else {
            log.info("Web Push disabled: VAPID keys not configured.");
        }
    }

    /** True when VAPID keys are present and the push client initialised. */
    public boolean isConfigured() {
        return configured;
    }

    /** The VAPID public key clients need to subscribe, or null when unconfigured. */
    public String getPublicKey() {
        return publicKey;
    }

    /**
     * Sends a push to every active browser subscription of the user. Never throws;
     * individual failures are logged and stale subscriptions are deactivated.
     */
    public void sendToUser(UUID userId, String title, String titleAr,
                           String body, String bodyAr, String actionUrl, NotificationType type) {
        if (!configured || userId == null) return;

        List<PushSubscription> subs = pushSubscriptionRepository.findByUserIdAndActiveTrue(userId);
        if (subs.isEmpty()) return;

        byte[] payload = buildPayload(title, titleAr, body, bodyAr, actionUrl, type);
        for (PushSubscription sub : subs) {
            try {
                Notification notification = new Notification(
                        sub.getEndpoint(), sub.getP256dh(), sub.getAuth(), payload);
                HttpResponse response = pushService.send(notification);
                int status = response.getStatusLine().getStatusCode();
                if (status == 404 || status == 410) {
                    sub.setActive(false);
                    pushSubscriptionRepository.save(sub);
                } else {
                    sub.setLastUsedAt(LocalDateTime.now());
                    pushSubscriptionRepository.save(sub);
                }
            } catch (Exception e) {
                log.warn("Web push to subscription {} failed: {}", sub.getId(), e.getMessage());
            }
        }
    }

    private byte[] buildPayload(String title, String titleAr, String body, String bodyAr,
                               String actionUrl, NotificationType type) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("title", title);
        data.put("titleAr", titleAr);
        data.put("body", body);
        data.put("bodyAr", bodyAr);
        data.put("actionUrl", actionUrl);
        data.put("type", type != null ? type.name() : null);
        try {
            return objectMapper.writeValueAsString(data).getBytes(StandardCharsets.UTF_8);
        } catch (Exception e) {
            return ("{\"title\":\"" + (title == null ? "" : title) + "\"}").getBytes(StandardCharsets.UTF_8);
        }
    }
}
