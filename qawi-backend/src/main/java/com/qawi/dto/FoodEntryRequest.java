package com.qawi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class FoodEntryRequest {
    @NotNull private UUID memberId;
    @NotBlank private String rawInput;
    private String mealType;
    private Double quantity;
    private String unit;
    private String foodName;
    private String foodNameAr;
    private Double calories;
    private Double proteinG;
    private Double carbsG;
    private Double fatG;
    private Double fiberG;
    private Double sugarG;
    private Double confidence;
    private String source;
}
