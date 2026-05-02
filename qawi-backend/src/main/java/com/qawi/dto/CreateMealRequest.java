package com.qawi.dto;

import com.qawi.entity.MealType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateMealRequest {
    @NotNull private MealType mealType;
    @NotBlank private String description;
    @NotBlank private String descriptionAr;
    private Integer calories;
    private Integer protein;
}
