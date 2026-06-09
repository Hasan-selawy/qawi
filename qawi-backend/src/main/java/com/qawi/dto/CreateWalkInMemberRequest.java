package com.qawi.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class CreateWalkInMemberRequest {
    @NotBlank private String name;
    @Email @NotBlank private String email;
    private String phone;
    private UUID coachId;
    private UUID planId;
    private LocalDate subscriptionEndDate;
    private String notes;
}
