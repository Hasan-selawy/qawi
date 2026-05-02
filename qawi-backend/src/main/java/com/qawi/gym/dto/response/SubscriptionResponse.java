package com.qawi.gym.dto.response;

import com.qawi.gym.entity.enums.SubscriptionStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class SubscriptionResponse {
    private Long id;
    private Long memberId;
    private String memberName;
    private String memberCode;
    private Long planId;
    private String planName;
    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal pricePaid;
    private SubscriptionStatus status;
    private Integer freezeDaysUsed;
    private LocalDate freezeStartDate;
    private String notes;
    private LocalDateTime createdAt;
}
