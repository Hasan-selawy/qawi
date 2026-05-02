package com.qawi.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateNutritionPlanRequest {
    @NotNull(message = "memberId is required")
    private UUID memberId;
}
