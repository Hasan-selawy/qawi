package com.qawi.repository;

import com.qawi.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
    Optional<RefreshToken> findByTokenHash(String tokenHash);

    /**
     * Atomically revoke a token only if it is currently active (not revoked and
     * not expired). The single {@code UPDATE ... WHERE} statement is the
     * concurrency gate for rotation: under READ COMMITTED, two simultaneous
     * refreshes presenting the same token serialize on the row, so exactly one
     * sees {@code revoked = false} and updates a row — the loser updates zero.
     *
     * @return number of rows updated (1 = caller won and may mint a replacement; 0 = invalid/expired/lost the race)
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE RefreshToken r SET r.revoked = true, r.revokedAt = :now, r.replacedByTokenHash = :newHash "
            + "WHERE r.tokenHash = :hash AND r.revoked = false AND r.expiresAt > :now")
    int revokeIfActive(@Param("hash") String hash, @Param("newHash") String newHash, @Param("now") Instant now);
}
