package com.qawi.dto;

import com.qawi.entity.GymLeadStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class GymLeadStatusUpdateRequest {
    @NotNull private GymLeadStatus status;
    private String note;
    private LocalDate nextFollowUpDate;
    private String assignedTo;
}
