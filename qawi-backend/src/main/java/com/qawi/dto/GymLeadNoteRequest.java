package com.qawi.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class GymLeadNoteRequest {
    @NotBlank private String content;
}
