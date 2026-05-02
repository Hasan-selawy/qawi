package com.qawi.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateCoachNoteRequest {
    @NotBlank private String note;
}
