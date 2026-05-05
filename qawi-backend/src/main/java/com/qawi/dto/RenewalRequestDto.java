package com.qawi.dto;

import com.qawi.entity.RenewalRequestStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RenewalRequestDto {
    private UUID id;
    private UUID memberId;
    private String memberName;
    private UUID gymId;
    private UUID planId;
    private String planName;
    private String planNameAr;
    private String planDuration;
    private RenewalRequestStatus status;
    private String notes;
    private LocalDateTime createdAt;
}
