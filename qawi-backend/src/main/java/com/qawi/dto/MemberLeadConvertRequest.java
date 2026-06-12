package com.qawi.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class MemberLeadConvertRequest {
    @NotBlank @Email private String email;
    @NotBlank        private String password;
    private UUID coachId;
    private LocalDate subscriptionEndDate;
    private UUID planId;
}
