package com.qawi.gym.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AttendanceResponse {
    private Long id;
    private Long memberId;
    private String memberName;
    private String memberCode;
    private Long gymId;
    private LocalDateTime checkInTime;
    private LocalDateTime checkOutTime;
    private String notes;
    private Long durationMinutes;
}
