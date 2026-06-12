package com.qawi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class FoodLogManualRequest {

    private UUID memberId;

    @NotBlank
    private String foodName;

    private String foodNameAr;

    @NotNull @Positive
    private Double quantity;

    @NotBlank
    private String unit;

    @NotBlank
    private String mealType;

    @NotNull @Positive
    private Double calories;

    @NotNull
    private Double protein;

    @NotNull
    private Double carbs;

    @NotNull
    private Double fat;

    private Double fiber;
    private Double sugar;

    private LocalDateTime loggedAt;
}
