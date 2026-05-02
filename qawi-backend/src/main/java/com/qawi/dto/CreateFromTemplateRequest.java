package com.qawi.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class CreateFromTemplateRequest {
    @NotNull private UUID templateId;
    @NotNull private UUID memberId;
    @NotNull private LocalDate startDate;
}
