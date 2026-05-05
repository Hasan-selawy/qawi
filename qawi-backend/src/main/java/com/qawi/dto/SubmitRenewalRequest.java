package com.qawi.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class SubmitRenewalRequest {
    private UUID planId;
    private String planName;
    private String planNameAr;
    private String planDuration;
    private String notes;
}
