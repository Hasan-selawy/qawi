package com.qawi.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class AddPlanExerciseRequest {
    private UUID exerciseTemplateId;
    private String customName;
    private String customNameAr;
    private int sets = 3;
    private int reps = 10;
    private double targetWeight = 0;
    private String videoUrl;
    private int orderIndex = 0;
}
