package com.qawi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * An admin-authored broadcast scheduled to fan out to an audience at a future
 * time. This is the campaign/intent record; per-recipient {@link Notification}
 * rows are only created when the broadcast is flushed by the scheduler.
 */
@Entity
@Table(name = "scheduled_notifications", indexes = {
        @Index(name = "idx_sched_notif_status_time", columnList = "status, scheduled_at"),
        @Index(name = "idx_sched_notif_gym", columnList = "gym_id")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ScheduledNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "gym_id", nullable = false)
    private UUID gymId;

    @Column(name = "created_by_user_id")
    private UUID createdByUserId;

    @Column(name = "title_en", nullable = false, columnDefinition = "TEXT")
    private String titleEn;

    @Column(name = "title_ar", nullable = false, columnDefinition = "TEXT")
    private String titleAr;

    @Column(name = "body_en", nullable = false, columnDefinition = "TEXT")
    private String bodyEn;

    @Column(name = "body_ar", nullable = false, columnDefinition = "TEXT")
    private String bodyAr;

    @Enumerated(EnumType.STRING)
    @Column(name = "audience", nullable = false, length = 40)
    private AudienceSegment audience;

    /** Set only when {@link #audience} is SPECIFIC_MEMBER. */
    @Column(name = "target_user_id")
    private UUID targetUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", length = 40)
    private NotificationCategory category;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", length = 20)
    private NotificationPriority priority;

    @Column(name = "action_url", length = 500)
    private String actionUrl;

    @Column(name = "scheduled_at", nullable = false)
    private LocalDateTime scheduledAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private ScheduledNotificationStatus status = ScheduledNotificationStatus.PENDING;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "recipient_count", nullable = false)
    @Builder.Default
    private int recipientCount = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
