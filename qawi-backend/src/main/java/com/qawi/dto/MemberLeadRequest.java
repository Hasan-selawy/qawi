package com.qawi.dto;

import com.qawi.entity.MemberLeadSource;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class MemberLeadRequest {
    @NotBlank private String name;
    @NotBlank private String phoneNumber;
    private String notes;
    @NotNull private MemberLeadSource source;
}
