package com.qawi.dto;

import com.qawi.entity.SubscriptionPlan;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class GymDetailResponse {
    private UUID id;
    private String name;
    private UUID ownerId;
    private SubscriptionPlan subscriptionPlan;
    private LocalDateTime subscriptionExpiresAt;
    private LocalDateTime createdAt;
    private String adminEmail;
    private long totalMembers;
    private long totalCoaches;
    private String subscriptionStatus;

    // Feature flags
    private boolean nutritionEnabled;
    private boolean pushNotificationsEnabled;
    private boolean customBrandingEnabled;
    private boolean classBookingEnabled;
    private boolean analyticsAdvancedEnabled;

    // Limits
    private Integer maxMembers;

    // Branding
    private String logoUrl;
    private String primaryColor;
}
