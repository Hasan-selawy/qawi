package com.qawi.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class MemberLeadRequest {
    @NotBlank private String name;
    @NotBlank private String phoneNumber;
    private String notes;
}
