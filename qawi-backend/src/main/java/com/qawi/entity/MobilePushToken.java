package com.qawi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * An Expo push token registered by the mobile app for a user/device.
 */
@Entity
@Table(name = "mobile_push_tokens",
        uniqueConstraints = @UniqueConstraint(name = "uk_mobile_token", columnNames = "expo_push_token"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MobilePushToken {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "gym_id")
    private UUID gymId;

    @Column(name = "expo_push_token", nullable = false, length = 255)
    private String expoPushToken;

    /** "ios" | "android". */
    @Column(name = "platform", length = 20)
    private String platform;

    @Column(name = "device_name", length = 200)
    private String deviceName;

    @Column(name = "active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "last_used_at")
    private LocalDateTime lastUsedAt;
}
