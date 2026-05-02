package com.qawi.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class StreakResponse {
    private int streak;
    private LocalDateTime lastCheckIn;
}
