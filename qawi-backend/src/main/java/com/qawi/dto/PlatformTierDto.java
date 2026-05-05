package com.qawi.dto;

import com.qawi.entity.SubscriptionPlan;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlatformTierDto {
    private UUID id;
    private String name;
    private String nameAr;
    private int price1m;
    private int price3m;
    private int price6m;
    private int price12m;
    private List<String> features;
    private List<String> featuresAr;
    private boolean active;
    private boolean highlighted;
    private int displayOrder;
    private Integer maxMembers;
    private Integer maxCoaches;
    private SubscriptionPlan subscriptionPlan;
    private int save6mPercent;
    private int save12mPercent;
}
