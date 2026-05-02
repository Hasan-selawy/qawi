package com.qawi.gym.dto.request;

import com.qawi.gym.entity.enums.BillingCycle;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class MembershipPlanRequest {

    @NotBlank(message = "Plan name is required")
    private String name;

    private String nameAr;
    private String description;

    @NotNull(message = "Price is required")
    @Positive(message = "Price must be positive")
    private BigDecimal price;

    @NotNull(message = "Billing cycle is required")
    private BillingCycle billingCycle;

    @NotNull(message = "Duration days is required")
    @Positive(message = "Duration must be positive")
    private Integer durationDays;

    private Integer maxFreezeDays;
    private Integer classesIncluded;
    private Boolean active;
    private String colorHex;
}
