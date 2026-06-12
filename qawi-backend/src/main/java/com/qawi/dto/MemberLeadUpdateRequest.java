package com.qawi.dto;

import com.qawi.entity.MemberLeadStatus;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class MemberLeadUpdateRequest {
    private MemberLeadStatus status;
    private String notes;
    private LocalDate nextFollowUpAt;
    private LocalDateTime lastContactedAt;
}
