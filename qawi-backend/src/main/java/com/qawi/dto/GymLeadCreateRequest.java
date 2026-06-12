package com.qawi.dto;

import com.qawi.entity.GymLeadSource;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class GymLeadCreateRequest {
    @NotBlank private String gymName;
    @NotBlank private String contactName;
    @NotBlank private String phoneNumber;
    @NotBlank private String city;
    @NotNull  private GymLeadSource source;
    private String potentialPlanId;
    private String notes;
    private LocalDate nextFollowUpDate;
    private String assignedTo;
}
