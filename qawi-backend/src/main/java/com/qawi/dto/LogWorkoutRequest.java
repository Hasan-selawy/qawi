package com.qawi.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class LogWorkoutRequest {
    @NotNull private UUID planExerciseId;
    private int actualSets;
    private int actualReps;
    private double actualWeight;
}
