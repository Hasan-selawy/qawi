package com.qawi.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class AssignCoachRequest {
    @NotNull private UUID coachId;
}
