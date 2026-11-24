package com.qawi.dto;

import java.math.BigDecimal;

import com.qawi.entity.MemberSubscriptionPlan;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class MemberSubscriptionRequest {
    @NotNull private LocalDate startDate;
    @NotNull private LocalDate endDate;
    @NotNull private MemberSubscriptionPlan plan;
    @jakarta.validation.constraints.DecimalMin("0.0")
    @jakarta.validation.constraints.Digits(integer = 16, fraction = 3)
    private BigDecimal price = BigDecimal.ZERO;
}
