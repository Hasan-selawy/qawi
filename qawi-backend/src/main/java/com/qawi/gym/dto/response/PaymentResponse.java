package com.qawi.gym.dto.response;

import com.qawi.gym.entity.enums.PaymentMethod;
import com.qawi.gym.entity.enums.PaymentStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class PaymentResponse {
    private Long id;
    private Long subscriptionId;
    private Long memberId;
    private String memberName;
    private BigDecimal amount;
    private PaymentMethod paymentMethod;
    private PaymentStatus status;
    private String transactionReference;
    private LocalDateTime paymentDate;
    private String notes;
    private String collectedBy;
    private LocalDateTime createdAt;
}
