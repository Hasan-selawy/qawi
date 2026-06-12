package com.qawi.dto;

import lombok.Data;

@Data
public class UpdateNutritionPlanDayRequest {
    private Integer targetCalories;
    private Integer targetProtein;
    private Integer targetCarbs;
    private Integer targetFat;
    private Double targetWater;
    private String goal;
    private String notes;
    private String notesAr;
}
