package com.qawi.gym.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AttendanceRequest {

    @NotNull(message = "Member ID is required")
    private Long memberId;

    @NotNull(message = "Gym ID is required")
    private Long gymId;

    private String notes;
}
