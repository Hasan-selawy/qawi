package com.qawi.dto;

import java.math.BigDecimal;

import com.qawi.entity.SubscriptionPlan;
import lombok.Data;

import java.util.List;

@Data
public class PlatformTierRequest {
    private String name;
    private String nameAr;
    @jakarta.validation.constraints.DecimalMin("0.0")
    @jakarta.validation.constraints.Digits(integer = 16, fraction = 3)
    private BigDecimal price1m;
    @jakarta.validation.constraints.DecimalMin("0.0")
    @jakarta.validation.constraints.Digits(integer = 16, fraction = 3)
    private BigDecimal price3m;
    @jakarta.validation.constraints.DecimalMin("0.0")
    @jakarta.validation.constraints.Digits(integer = 16, fraction = 3)
    private BigDecimal price6m;
    @jakarta.validation.constraints.DecimalMin("0.0")
    @jakarta.validation.constraints.Digits(integer = 16, fraction = 3)
    private BigDecimal price12m;
    private List<String> features;
    private List<String> featuresAr;
    private Boolean active;
    private Boolean highlighted;
    private Integer displayOrder;
    private Integer maxMembers;
    private Integer maxCoaches;
    private SubscriptionPlan subscriptionPlan;
}
