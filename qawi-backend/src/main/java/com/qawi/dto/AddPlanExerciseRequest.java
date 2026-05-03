package com.qawi.dto;

import jakarta.validation.constraints.Min;
import lombok.Data;

import java.util.UUID;

@Data
public class AddPlanExerciseRequest {
    private UUID exerciseTemplateId;
    private String customName;
    private String customNameAr;
    @Min(value = 1, message = "sets must be at least 1")
    private int sets = 3;
    @Min(value = 1, message = "reps must be at least 1")
    private int reps = 10;
    @Min(value = 0, message = "targetWeight must be >= 0")
    private double targetWeight = 0;
    private String videoUrl;
    @Min(value = 0, message = "orderIndex must be >= 0")
    private int orderIndex = 0;
}
