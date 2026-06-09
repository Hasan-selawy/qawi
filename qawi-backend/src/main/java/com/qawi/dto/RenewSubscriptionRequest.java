package com.qawi.dto;

import jakarta.validation.constraints.Min;
import lombok.Data;

import java.util.UUID;

@Data
public class RenewSubscriptionRequest {
    private UUID planId;
    @Min(1) private int durationMonths;
}
