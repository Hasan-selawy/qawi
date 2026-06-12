package com.qawi.dto;

import com.qawi.entity.MemberLeadStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class MemberLeadUpdateRequest {
    @NotNull private MemberLeadStatus status;
    private String notes;
}
