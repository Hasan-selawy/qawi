package com.qawi.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class StaffAttendanceRequest {
    @NotNull private LocalDate date;
    private LocalDateTime checkIn;
    private LocalDateTime checkOut;
    private String status;
    private String notes;
}
