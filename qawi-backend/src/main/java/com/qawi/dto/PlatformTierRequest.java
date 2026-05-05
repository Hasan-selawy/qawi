package com.qawi.dto;

import com.qawi.entity.SubscriptionPlan;
import lombok.Data;

import java.util.List;

@Data
public class PlatformTierRequest {
    private String name;
    private String nameAr;
    private Integer price1m;
    private Integer price3m;
    private Integer price6m;
    private Integer price12m;
    private List<String> features;
    private List<String> featuresAr;
    private Boolean active;
    private Boolean highlighted;
    private Integer displayOrder;
    private Integer maxMembers;
    private Integer maxCoaches;
    private SubscriptionPlan subscriptionPlan;
}
