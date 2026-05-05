package com.qawi.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class CoachMemberSummary {
    private UUID id;
    private String name;
    private String email;
    private LocalDateTime lastCheckinDate;
    private String currentWorkoutPlanName;
    private long workoutsCompletedThisWeek;
    private String subscriptionStatus;
    private boolean isActive;
    private String nutritionStatus; // "LOGGED" | "NOT_LOGGED" | "NO_PLAN"
}
