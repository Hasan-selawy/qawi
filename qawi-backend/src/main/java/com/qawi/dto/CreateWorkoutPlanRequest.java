package com.qawi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class CreateWorkoutPlanRequest {
    @NotBlank private String name;
    @NotNull private UUID memberId;
    @NotNull private LocalDate startDate;
    @NotNull private LocalDate endDate;
}
