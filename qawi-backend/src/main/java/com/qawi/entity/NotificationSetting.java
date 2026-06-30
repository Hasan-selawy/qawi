package com.qawi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Per-gym configuration for the automatic notification jobs. One row per gym,
 * lazily created with defaults the first time it is read.
 */
@Entity
@Table(name = "notification_settings",
        uniqueConstraints = @UniqueConstraint(name = "uk_notif_setting_gym", columnNames = "gym_id"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NotificationSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "gym_id", nullable = false)
    private UUID gymId;

    // ── Membership expiry reminders ───────────────────────────────────────
    @Column(name = "membership_expiry_enabled", nullable = false)
    @Builder.Default
    private boolean membershipExpiryEnabled = true;

    /** CSV of "days before expiry" to remind on, e.g. "7,3,1". */
    @Column(name = "expiry_reminder_days", length = 100, nullable = false)
    @Builder.Default
    private String expiryReminderDays = "7,3,1";

    @Column(name = "expired_alert_enabled", nullable = false)
    @Builder.Default
    private boolean expiredAlertEnabled = true;

    // ── Inactivity ────────────────────────────────────────────────────────
    @Column(name = "inactive_member_enabled", nullable = false)
    @Builder.Default
    private boolean inactiveMemberEnabled = true;

    @Column(name = "inactive_after_days", nullable = false)
    @Builder.Default
    private int inactiveAfterDays = 7;

    // ── Class reminders ───────────────────────────────────────────────────
    @Column(name = "class_reminder_enabled", nullable = false)
    @Builder.Default
    private boolean classReminderEnabled = true;

    @Column(name = "class_reminder_minutes_before", nullable = false)
    @Builder.Default
    private int classReminderMinutesBefore = 60;

    // ── Admin alerts (new member, report submitted, renewal request, etc.) ─
    @Column(name = "admin_alerts_enabled", nullable = false)
    @Builder.Default
    private boolean adminAlertsEnabled = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
