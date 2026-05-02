package com.qawi.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateMeasurementRequest {
    @NotNull private UUID memberId;
    private Double weight;
    private Double height;
    private Double chest;
    private Double waist;
    private Double hips;
    private Double arms;
    private Double legs;
    private Double bodyFatPercentage;
    private String notes;
}
