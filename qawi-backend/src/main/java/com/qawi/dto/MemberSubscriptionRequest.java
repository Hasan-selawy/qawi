package com.qawi.dto;

import com.qawi.entity.MemberSubscriptionPlan;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class MemberSubscriptionRequest {
    @NotNull private LocalDate startDate;
    @NotNull private LocalDate endDate;
    @NotNull private MemberSubscriptionPlan plan;
    private double price;
}
