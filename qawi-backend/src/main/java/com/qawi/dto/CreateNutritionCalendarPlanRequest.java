package com.qawi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class CreateNutritionCalendarPlanRequest {

    @NotNull
    private UUID memberId;

    @NotBlank
    private String title;

    @NotNull
    private LocalDate startDate;

    @NotNull
    private LocalDate endDate;

    private Integer defaultTargetCalories;
    private Integer defaultTargetProtein;
    private Integer defaultTargetCarbs;
    private Integer defaultTargetFat;
    private Double defaultTargetWater;
    private String goal;
    private String notes;
}
