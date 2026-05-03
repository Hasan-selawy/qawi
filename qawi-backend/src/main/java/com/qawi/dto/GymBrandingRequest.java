package com.qawi.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class GymBrandingRequest {
    @Size(max = 1024)
    private String logoUrl;

    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$|^$", message = "primaryColor must be a 6-digit hex like #22c55e")
    private String primaryColor;
}
