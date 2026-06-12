package com.qawi.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class WaterAddRequest {

    private UUID memberId;

    @NotNull @DecimalMin("0.05") @DecimalMax("5.0")
    private Double amount;

    private LocalDateTime loggedAt;
}
