package com.qawi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateCoachNoteRequest {
    @NotNull private UUID memberId;
    @NotBlank private String note;
}
