package com.qawi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "gyms")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Gym {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(name = "owner_id")
    private UUID ownerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "subscription_plan", nullable = false)
    private SubscriptionPlan subscriptionPlan;

    @Column(name = "subscription_expires_at")
    private LocalDateTime subscriptionExpiresAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // ── Per-gym Pro feature flags (super-admin controlled) ──────────────
    // nutrition + push default to ON to preserve existing behaviour for
    // already-provisioned gyms; the rest are Pro upsells defaulting to OFF.

    @Column(name = "nutrition_enabled", nullable = false)
    @Builder.Default
    private boolean nutritionEnabled = true;

    @Column(name = "push_notifications_enabled", nullable = false)
    @Builder.Default
    private boolean pushNotificationsEnabled = true;

    @Column(name = "custom_branding_enabled", nullable = false)
    @Builder.Default
    private boolean customBrandingEnabled = false;

    @Column(name = "class_booking_enabled", nullable = false)
    @Builder.Default
    private boolean classBookingEnabled = false;

    @Column(name = "analytics_advanced_enabled", nullable = false)
    @Builder.Default
    private boolean analyticsAdvancedEnabled = false;

    // ── Limits ──────────────────────────────────────────────────────────
    // null = unlimited
    @Column(name = "max_members")
    private Integer maxMembers;

    // ── Branding ────────────────────────────────────────────────────────
    @Column(name = "logo_url")
    private String logoUrl;

    /** Hex string e.g. "#22c55e". Only honoured when customBrandingEnabled is true. */
    @Column(name = "primary_color")
    private String primaryColor;

    @Enumerated(EnumType.STRING)
    @Column(name = "nutrition_workflow", columnDefinition = "VARCHAR(30) DEFAULT 'COACH_ONLY'")
    @Builder.Default
    private NutritionWorkflow nutritionWorkflow = NutritionWorkflow.COACH_ONLY;
}
