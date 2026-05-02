package com.qawi.dto;

import com.qawi.entity.SubscriptionPlan;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CreateGymRequest {

    @NotBlank(message = "Gym name is required")
    private String gymName;

    @NotBlank(message = "Admin name is required")
    private String adminName;

    @NotBlank(message = "Admin email is required")
    @Email(message = "Invalid email format")
    private String adminEmail;

    @NotBlank(message = "Admin password is required")
    private String adminPassword;

    @NotNull(message = "Subscription plan is required")
    private SubscriptionPlan subscriptionPlan;

    private LocalDateTime subscriptionExpiresAt;
}
