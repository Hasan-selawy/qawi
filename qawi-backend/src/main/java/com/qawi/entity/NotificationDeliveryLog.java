package com.qawi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Idempotency ledger for automatic / scheduled notifications. A row is inserted
 * (guarded by a DB unique constraint on {@code unique_key}) BEFORE the matching
 * notification is created, so a job that runs twice cannot double-notify.
 */
@Entity
@Table(name = "notification_delivery_log",
        uniqueConstraints = @UniqueConstraint(name = "uk_notif_delivery_key", columnNames = "unique_key"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NotificationDeliveryLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "unique_key", nullable = false, length = 255)
    private String uniqueKey;

    @Column(name = "gym_id")
    private UUID gymId;

    @Column(name = "user_id")
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", length = 40)
    private NotificationType type;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
