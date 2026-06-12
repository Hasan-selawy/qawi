package com.qawi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class FoodCalculateRequest {

    @NotBlank
    private String foodName;

    @NotNull @Positive
    private Double quantity;

    @NotBlank
    private String unit;
}
