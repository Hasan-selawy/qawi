package com.qawi.dto;

import com.qawi.entity.SubscriptionPlan;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class UpdateSubscriptionRequest {

    @NotNull(message = "Subscription plan is required")
    private SubscriptionPlan subscriptionPlan;

    private LocalDateTime subscriptionExpiresAt;
}
