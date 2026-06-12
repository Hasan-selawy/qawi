package com.qawi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class FoodLogRequest {

    private UUID memberId;

    @NotBlank
    private String foodName;

    @NotNull @Positive
    private Double quantity;

    @NotBlank
    private String unit;

    @NotBlank
    private String mealType;

    private LocalDateTime loggedAt;
}
