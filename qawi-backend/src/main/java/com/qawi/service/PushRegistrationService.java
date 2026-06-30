package com.qawi.service;

import com.qawi.dto.RegisterMobileTokenRequest;
import com.qawi.dto.RegisterWebPushRequest;
import com.qawi.entity.MobilePushToken;
import com.qawi.entity.PushSubscription;
import com.qawi.entity.User;
import com.qawi.exception.AppException;
import com.qawi.repository.MobilePushTokenRepository;
import com.qawi.repository.PushSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Registers / removes the per-user push targets (browser Web Push subscriptions
 * and Expo mobile tokens). Registration is idempotent: re-registering an existing
 * endpoint/token re-points it at the current user and reactivates it.
 */
@Service
@RequiredArgsConstructor
public class PushRegistrationService {

    private final PushSubscriptionRepository pushSubscriptionRepository;
    private final MobilePushTokenRepository mobilePushTokenRepository;

    // ── Web (browser) ─────────────────────────────────────────────────────

    @Transactional
    public PushSubscription registerWeb(User user, RegisterWebPushRequest req) {
        assertSafeEndpoint(req.getEndpoint());
        PushSubscription sub = pushSubscriptionRepository.findByEndpoint(req.getEndpoint())
                .orElseGet(PushSubscription::new);
        sub.setUserId(user.getId());
        sub.setGymId(user.getGymId());
        sub.setEndpoint(req.getEndpoint());
        sub.setP256dh(req.getP256dh());
        sub.setAuth(req.getAuth());
        sub.setUserAgent(req.getUserAgent());
        sub.setActive(true);
        sub.setLastUsedAt(LocalDateTime.now());
        return pushSubscriptionRepository.save(sub);
    }

    @Transactional
    public void removeWeb(UUID userId, String endpoint) {
        pushSubscriptionRepository.findByEndpoint(endpoint)
                .filter(s -> s.getUserId().equals(userId))
                .ifPresent(s -> {
                    s.setActive(false);
                    pushSubscriptionRepository.save(s);
                });
    }

    // ── Mobile (Expo) ─────────────────────────────────────────────────────

    @Transactional
    public MobilePushToken registerMobile(User user, RegisterMobileTokenRequest req) {
        MobilePushToken token = mobilePushTokenRepository.findByExpoPushToken(req.getExpoPushToken())
                .orElseGet(MobilePushToken::new);
        token.setUserId(user.getId());
        token.setGymId(user.getGymId());
        token.setExpoPushToken(req.getExpoPushToken());
        token.setPlatform(req.getPlatform());
        token.setDeviceName(req.getDeviceName());
        token.setActive(true);
        token.setLastUsedAt(LocalDateTime.now());
        return mobilePushTokenRepository.save(token);
    }

    @Transactional
    public void removeMobile(UUID userId, String expoPushToken) {
        mobilePushTokenRepository.findByExpoPushToken(expoPushToken)
                .filter(t -> t.getUserId().equals(userId))
                .ifPresent(t -> {
                    t.setActive(false);
                    mobilePushTokenRepository.save(t);
                });
    }

    // ── SSRF protection ───────────────────────────────────────────────────

    /**
     * The web push endpoint is later used by the server as an outbound HTTP
     * target. Reject anything that isn't a public HTTPS URL so an authenticated
     * user cannot register an internal/private address and turn the server into
     * an SSRF proxy. Validated once at registration time.
     */
    private void assertSafeEndpoint(String endpoint) {
        URI uri;
        try {
            uri = URI.create(endpoint.trim());
        } catch (Exception e) {
            throw badEndpoint();
        }
        String scheme = uri.getScheme();
        String host = uri.getHost();
        if (scheme == null || !scheme.equalsIgnoreCase("https") || host == null || host.isBlank()) {
            throw badEndpoint();
        }
        try {
            for (InetAddress addr : InetAddress.getAllByName(host)) {
                if (isDisallowed(addr)) {
                    throw badEndpoint();
                }
            }
        } catch (UnknownHostException e) {
            throw badEndpoint();
        }
    }

    /** True for loopback / private / link-local / multicast / reserved ranges. */
    private boolean isDisallowed(InetAddress addr) {
        if (addr.isLoopbackAddress() || addr.isAnyLocalAddress() || addr.isLinkLocalAddress()
                || addr.isSiteLocalAddress() || addr.isMulticastAddress()) {
            return true;
        }
        byte[] b = addr.getAddress();
        if (b.length == 4) {
            int first = b[0] & 0xFF;
            int second = b[1] & 0xFF;
            // 100.64.0.0/10 (CGNAT) and 169.254.0.0/16 (link-local, defensive).
            if (first == 100 && second >= 64 && second <= 127) return true;
            if (first == 169 && second == 254) return true;
        } else if (b.length == 16) {
            // fc00::/7 unique-local addresses (not covered by isSiteLocalAddress for IPv6).
            if ((b[0] & 0xFE) == 0xFC) return true;
        }
        return false;
    }

    private AppException badEndpoint() {
        return new AppException(
                "Invalid push endpoint", "نقطة إشعار غير صالحة", HttpStatus.BAD_REQUEST);
    }
}
