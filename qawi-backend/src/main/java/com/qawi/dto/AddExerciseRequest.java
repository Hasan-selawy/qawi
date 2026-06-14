package com.qawi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class AddExerciseRequest {
    @NotNull private UUID categoryId;
    @NotBlank private String name;
    @NotBlank private String nameAr;
    private int defaultSets = 3;
    private int defaultReps = 10;
    private double defaultWeight = 0;
    private String videoUrl;
    private String imageUrl;
}
