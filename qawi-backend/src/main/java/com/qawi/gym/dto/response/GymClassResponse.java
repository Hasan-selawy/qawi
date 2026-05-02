package com.qawi.gym.dto.response;

import com.qawi.gym.entity.enums.ClassStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class GymClassResponse {
    private Long id;
    private Long gymId;
    private String name;
    private String nameAr;
    private String description;
    private Long trainerId;
    private String trainerName;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Integer maxCapacity;
    private Long bookedCount;
    private ClassStatus status;
    private String location;
    private LocalDateTime createdAt;
}
