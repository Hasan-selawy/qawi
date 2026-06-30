package com.qawi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

/**
 * Per-user notification preferences. One row per user, lazily created with
 * sensible defaults the first time it is read.
 */
@Entity
@Table(name = "notification_preferences",
        uniqueConstraints = @UniqueConstraint(name = "uk_notif_pref_user", columnNames = "user_id"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NotificationPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "gym_id")
    private UUID gymId;

    // ── Channels ──────────────────────────────────────────────────────────
    @Column(name = "in_app_enabled", nullable = false)
    @Builder.Default
    private boolean inAppEnabled = true;

    @Column(name = "browser_push_enabled", nullable = false)
    @Builder.Default
    private boolean browserPushEnabled = true;

    @Column(name = "mobile_push_enabled", nullable = false)
    @Builder.Default
    private boolean mobilePushEnabled = true;

    // ── Category opt-outs ─────────────────────────────────────────────────
    @Column(name = "membership_enabled", nullable = false)
    @Builder.Default
    private boolean membershipEnabled = true;

    @Column(name = "attendance_enabled", nullable = false)
    @Builder.Default
    private boolean attendanceEnabled = true;

    @Column(name = "class_enabled", nullable = false)
    @Builder.Default
    private boolean classEnabled = true;

    @Column(name = "workout_enabled", nullable = false)
    @Builder.Default
    private boolean workoutEnabled = true;

    @Column(name = "nutrition_enabled", nullable = false)
    @Builder.Default
    private boolean nutritionEnabled = true;

    @Column(name = "admin_alerts_enabled", nullable = false)
    @Builder.Default
    private boolean adminAlertsEnabled = true;

    @Column(name = "broadcast_enabled", nullable = false)
    @Builder.Default
    private boolean broadcastEnabled = true;

    // ── Misc ──────────────────────────────────────────────────────────────
    /** "EN" or "AR" — null means follow the client/app language. */
    @Column(name = "preferred_language", length = 5)
    private String preferredLanguage;

    /** Quiet hours window. When both set, automatic pushes are suppressed inside it. */
    @Column(name = "quiet_hours_start")
    private LocalTime quietHoursStart;

    @Column(name = "quiet_hours_end")
    private LocalTime quietHoursEnd;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
