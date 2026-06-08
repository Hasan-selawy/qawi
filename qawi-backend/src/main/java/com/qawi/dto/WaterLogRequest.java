package com.qawi.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class WaterLogRequest {
    @NotNull private UUID memberId;
    @Min(1) private int amountMl;
}
