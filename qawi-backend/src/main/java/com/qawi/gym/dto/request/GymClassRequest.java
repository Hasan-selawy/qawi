package com.qawi.gym.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class GymClassRequest {

    @NotBlank(message = "Class name is required")
    private String name;

    private String nameAr;
    private String description;
    private Long trainerId;

    @NotNull(message = "Start time is required")
    private LocalDateTime startTime;

    @NotNull(message = "End time is required")
    private LocalDateTime endTime;

    @NotNull(message = "Max capacity is required")
    @Positive(message = "Capacity must be positive")
    private Integer maxCapacity;

    private String location;
}
