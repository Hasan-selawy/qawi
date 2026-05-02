package com.qawi.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ErrorResponse {
    private String error;
    private String messageAr;
    private LocalDateTime timestamp;
}
