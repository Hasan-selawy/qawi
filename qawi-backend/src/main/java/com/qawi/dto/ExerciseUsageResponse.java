package com.qawi.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExerciseUsageResponse {
    private UUID memberId;
    private String memberName;
    private UUID planId;
    private String planName;
    private UUID dayId;
    private String dayName;
    private LocalDate dayDate;
    private int sets;
    private int reps;
    private LocalDateTime lastLoggedAt;
    private Double lastWeight;
}
