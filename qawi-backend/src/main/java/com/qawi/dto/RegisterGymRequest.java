package com.qawi.dto;

import com.qawi.entity.SubscriptionPlan;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterGymRequest {

    @NotBlank(message = "Gym name is required")
    @Size(min = 3, message = "Gym name must be at least 3 characters")
    private String gymName;

    @NotBlank(message = "Admin name is required")
    private String adminName;

    @NotBlank(message = "Admin email is required")
    @Email(message = "Invalid email format")
    private String adminEmail;

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    private String adminPassword;

    @NotNull(message = "Subscription plan is required")
    private SubscriptionPlan subscriptionPlan;
}
