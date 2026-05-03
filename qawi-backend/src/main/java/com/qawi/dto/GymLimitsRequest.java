package com.qawi.dto;

import jakarta.validation.constraints.Min;
import lombok.Data;

@Data
public class GymLimitsRequest {
    /** null = unlimited */
    @Min(value = 0, message = "maxMembers must be >= 0")
    private Integer maxMembers;
}
