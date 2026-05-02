package com.qawi.gym.dto.response;

import com.qawi.gym.entity.enums.BillingCycle;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class MembershipPlanResponse {
    private Long id;
    private Long gymId;
    private String name;
    private String nameAr;
    private String description;
    private BigDecimal price;
    private BillingCycle billingCycle;
    private Integer durationDays;
    private Integer maxFreezeDays;
    private Integer classesIncluded;
    private boolean active;
    private String colorHex;
    private LocalDateTime createdAt;
}
