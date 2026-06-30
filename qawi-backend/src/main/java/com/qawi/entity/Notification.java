package com.qawi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "notifications", indexes = {
        @Index(name = "idx_notifications_user_created", columnList = "user_id, created_at"),
        @Index(name = "idx_notifications_user_read", columnList = "user_id, is_read")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    /** Gym the recipient belongs to at creation time (nullable for platform users). */
    @Column(name = "gym_id")
    private UUID gymId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationType type;

    /** Optional short title (English). Body lives in {@link #message}. */
    @Column(name = "title_en", columnDefinition = "TEXT")
    private String titleEn;

    @Column(name = "title_ar", columnDefinition = "TEXT")
    private String titleAr;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(name = "message_ar", nullable = false, columnDefinition = "TEXT")
    private String messageAr;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", length = 40)
    private NotificationCategory category;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", length = 20)
    private NotificationPriority priority;

    /** Optional deep-link / route the client can navigate to (e.g. "/member/renewal"). */
    @Column(name = "action_url", length = 500)
    private String actionUrl;

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private boolean isRead = false;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    @Column(name = "archived", nullable = false)
    @Builder.Default
    private boolean archived = false;

    /**
     * Trace of the idempotency key that produced an automatic notification.
     * Canonical duplicate prevention lives in {@link NotificationDeliveryLog};
     * this is a debug/audit pointer only.
     */
    @Column(name = "unique_key", length = 255)
    private String uniqueKey;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
