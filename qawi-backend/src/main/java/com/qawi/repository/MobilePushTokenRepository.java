package com.qawi.repository;

import com.qawi.entity.MobilePushToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MobilePushTokenRepository extends JpaRepository<MobilePushToken, UUID> {
    Optional<MobilePushToken> findByExpoPushToken(String expoPushToken);
    List<MobilePushToken> findByUserIdAndActiveTrue(UUID userId);
    List<MobilePushToken> findByUserId(UUID userId);
}
