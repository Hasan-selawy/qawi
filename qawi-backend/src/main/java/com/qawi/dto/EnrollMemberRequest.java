package com.qawi.dto;

import com.qawi.entity.TemplateType;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class EnrollMemberRequest {
    @NotBlank private String deviceSerial;
    @NotBlank private String deviceUserId;
    private TemplateType templateType = TemplateType.UNKNOWN;
}
