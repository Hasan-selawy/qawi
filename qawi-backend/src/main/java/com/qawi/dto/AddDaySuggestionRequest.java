package com.qawi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AddDaySuggestionRequest {

    @NotBlank
    private String mealType;

    @NotBlank
    private String description;

    private String descriptionAr;
    private Integer targetCalories;
    private Integer targetProtein;
}
