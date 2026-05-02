package com.qawi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class AddScheduleDayRequest {
    @NotNull private LocalDate dayDate;
    @NotBlank private String dayName;
    @NotBlank private String dayNameAr;
    private boolean isRestDay = false;
}
