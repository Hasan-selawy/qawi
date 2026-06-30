package com.qawi.service;

import com.qawi.entity.RefreshToken;
import com.qawi.exception.AppException;
import com.qawi.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

/**
 * Issues, rotates and revokes opaque refresh tokens.
 *
 * <p>The access JWT remains short-livable and self-contained; refresh tokens give
 * clients a way to obtain a new access token without re-entering credentials, and
 * give the server a way to revoke a session (logout). Only the SHA-256 hash of
 * each token is stored — the raw value is shown to the client exactly once.
 *
 * <p>On every successful refresh the presented token is rotated (revoked and
 * replaced) to limit the window of a stolen token. Default lifetime is
 * {@code QAWI_REFRESH_TOKEN_DAYS=30}.
 */
@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private final RefreshTokenRepository repository;

    @Value("${QAWI_REFRESH_TOKEN_DAYS:30}")
    private long refreshTokenDays;

    private static final SecureRandom RNG = new SecureRandom();
    private static final Base64.Encoder B64 = Base64.getUrlEncoder().withoutPadding();

    /** Result of a rotation: the owning user and the freshly-minted raw token. */
    public record Rotation(UUID userId, String rawToken) {}

    /** Issue a new opaque refresh token for a user; only its hash is persisted. */
    @Transactional
    public String issue(UUID userId) {
        String raw = randomToken();
        repository.save(RefreshToken.builder()
                .userId(userId)
                .tokenHash(sha256(raw))
                .createdAt(Instant.now())
                .expiresAt(Instant.now().plus(Duration.ofDays(refreshTokenDays)))
                .revoked(false)
                .build());
        return raw;
    }

    /**
     * Validate and rotate a presented token: revoke it (single-use) and issue a
     * replacement. Rotation is enforced atomically by {@code revokeIfActive} so a
     * token cannot be refreshed twice — even under concurrent requests presenting
     * the same raw token, exactly one wins and the others get a 401.
     */
    @Transactional
    public Rotation rotate(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw invalid();
        }
        String hash = sha256(rawToken);
        // Read first only to recover the owning user id; the conditional update
        // below — not this read — is what guards against replay/double-use.
        RefreshToken current = repository.findByTokenHash(hash).orElseThrow(this::invalid);
        UUID userId = current.getUserId();

        String newRaw = randomToken();
        String newHash = sha256(newRaw);

        int won = repository.revokeIfActive(hash, newHash, Instant.now());
        if (won == 0) {
            // Token was already revoked/expired, or another concurrent refresh
            // rotated it first. Either way this presentation is no longer valid.
            throw invalid();
        }

        repository.save(RefreshToken.builder()
                .userId(userId)
                .tokenHash(newHash)
                .createdAt(Instant.now())
                .expiresAt(Instant.now().plus(Duration.ofDays(refreshTokenDays)))
                .revoked(false)
                .build());
        return new Rotation(userId, newRaw);
    }

    /** Revoke a presented token (idempotent; unknown/blank tokens are ignored). */
    @Transactional
    public void revoke(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return;
        }
        repository.findByTokenHash(sha256(rawToken)).ifPresent(rt -> {
            if (!rt.isRevoked()) {
                rt.setRevoked(true);
                rt.setRevokedAt(Instant.now());
                repository.save(rt);
            }
        });
    }

    private RefreshToken requireActive(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw invalid();
        }
        RefreshToken rt = repository.findByTokenHash(sha256(rawToken)).orElseThrow(this::invalid);
        if (rt.isRevoked() || rt.getExpiresAt().isBefore(Instant.now())) {
            throw invalid();
        }
        return rt;
    }

    private AppException invalid() {
        return new AppException(
                "Invalid or expired refresh token",
                "رمز التحديث غير صالح أو منتهي الصلاحية",
                HttpStatus.UNAUTHORIZED);
    }

    private String randomToken() {
        byte[] bytes = new byte[32];
        RNG.nextBytes(bytes);
        return B64.encodeToString(bytes);
    }

    private String sha256(String value) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                sb.append(Character.forDigit((b >> 4) & 0xF, 16));
                sb.append(Character.forDigit(b & 0xF, 16));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }
}
