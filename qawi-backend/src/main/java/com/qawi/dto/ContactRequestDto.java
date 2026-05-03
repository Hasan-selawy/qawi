package com.qawi.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class ContactRequestDto {
    private UUID id;
    private String fullName;
    private String phoneNumber;
    private String gymName;
    private String city;
    private String message;
    private LocalDateTime createdAt;
    private boolean contacted;
}
