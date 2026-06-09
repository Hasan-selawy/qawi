package com.qawi.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data @Builder
public class ReceptionMemberResult {
    private UUID id;
    private String name;
    private String email;
    private String phone;
    private String coachName;
    private String subscriptionStatus;
    private LocalDate subscriptionEndDate;
    private LocalDateTime lastCheckin;
    private int attendanceStreak;
    private boolean active;
}
