package com.qawi.dto;

import java.math.BigDecimal;

import com.qawi.entity.SubscriptionPlan;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PlanInfo {
    private SubscriptionPlan plan;
    private BigDecimal price;
    private String currency;
    private String billingCycle;
    private Integer yearlyPrice;
    private Integer yearlySavings;
    private int maxMembers;
    private int maxCoaches;
}
