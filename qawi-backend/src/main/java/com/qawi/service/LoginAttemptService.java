package com.qawi.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory, per-account brute-force lockout.
 *
 * <p>Tracks consecutive failed login attempts keyed by the normalized email and
 * temporarily blocks further attempts once a threshold is reached. This is a
 * single-instance safeguard kept intentionally dependency-free (no Redis). For a
 * horizontally-scaled deployment the counters must live in a shared store —
 * see {@code QAWI_SECURITY.md} ("External infrastructure required").
 *
 * <p>Defaults: {@code QAWI_LOGIN_MAX_ATTEMPTS=5}, {@code QAWI_LOGIN_LOCK_MINUTES=15}.
 */
@Service
public class LoginAttemptService {

    private final int maxAttempts;
    private final Duration lockDuration;

    private final Map<String, Attempt> attempts = new ConcurrentHashMap<>();

    public LoginAttemptService(
            @Value("${QAWI_LOGIN_MAX_ATTEMPTS:5}") int maxAttempts,
            @Value("${QAWI_LOGIN_LOCK_MINUTES:15}") long lockMinutes) {
        this.maxAttempts = Math.max(maxAttempts, 1);
        this.lockDuration = Duration.ofMinutes(Math.max(lockMinutes, 1));
    }

    private static final class Attempt {
        int count;
        Instant lockedUntil;
    }

    /** True if the account is currently within an active lock window. */
    public boolean isLocked(String email) {
        String key = key(email);
        Attempt a = attempts.get(key);
        if (a == null || a.lockedUntil == null) {
            return false;
        }
        if (Instant.now().isAfter(a.lockedUntil)) {
            // Lock window elapsed — forget the account so it starts fresh.
            attempts.remove(key);
            return false;
        }
        return true;
    }

    /** Seconds remaining until the account unlocks (0 if not locked). */
    public long secondsUntilUnlock(String email) {
        Attempt a = attempts.get(key(email));
        if (a == null || a.lockedUntil == null) {
            return 0;
        }
        long secs = Duration.between(Instant.now(), a.lockedUntil).getSeconds();
        return Math.max(secs, 0);
    }

    /** Record a failed credential attempt; locks the account at the threshold. */
    public void recordFailure(String email) {
        attempts.compute(key(email), (k, a) -> {
            if (a == null) {
                a = new Attempt();
            }
            a.count++;
            if (a.count >= maxAttempts) {
                a.lockedUntil = Instant.now().plus(lockDuration);
            }
            return a;
        });
    }

    /** Clear all failure state after a successful login. */
    public void recordSuccess(String email) {
        attempts.remove(key(email));
    }

    private String key(String email) {
        return email == null ? "" : email.toLowerCase().trim();
    }
}
