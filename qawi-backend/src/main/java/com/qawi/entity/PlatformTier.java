package com.qawi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "platform_tiers")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PlatformTier {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(name = "name_ar")
    private String nameAr;

    @Column(name = "price_1m", nullable = false)
    private int price1m;

    @Column(name = "price_3m", nullable = false)
    private int price3m;

    @Column(name = "price_6m", nullable = false)
    private int price6m;

    @Column(name = "price_12m", nullable = false)
    private int price12m;

    @Column(name = "features", columnDefinition = "text")
    private String features;

    @Column(name = "features_ar", columnDefinition = "text")
    private String featuresAr;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "is_highlighted", nullable = false)
    @Builder.Default
    private boolean highlighted = false;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private int displayOrder = 0;

    @Column(name = "max_members")
    private Integer maxMembers;

    @Column(name = "max_coaches")
    private Integer maxCoaches;

    @Enumerated(EnumType.STRING)
    @Column(name = "subscription_plan", nullable = false)
    private SubscriptionPlan subscriptionPlan;
}
