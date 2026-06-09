package com.qawi.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class FoodAnalysisRequest {
    @NotBlank private String input;
}
