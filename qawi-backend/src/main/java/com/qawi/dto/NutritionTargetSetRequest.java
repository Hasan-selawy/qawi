package com.qawi.dto;

import com.qawi.entity.NutritionGoal;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.util.UUID;

@Data
public class NutritionTargetSetRequest {

    @NotNull
    private UUID memberId;

    @NotNull @Min(1000) @Max(6000)
    private Integer targetCalories;

    @NotNull @Min(0) @Max(400)
    private Integer targetProtein;

    @NotNull @Min(0) @Max(800)
    private Integer targetCarbs;

    @NotNull @Min(0) @Max(300)
    private Integer targetFat;

    @DecimalMin("0.0") @DecimalMax("10.0")
    private Double targetWater;

    private NutritionGoal goal;

    private String notes;
}
