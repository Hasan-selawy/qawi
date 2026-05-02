package com.qawi.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class RegisterGymResponse {
    private String token;
    private UserDto user;
    private GymDetailResponse gym;
    private LocalDateTime trialExpiresAt;
    private String message;
    private String messageAr;
}
