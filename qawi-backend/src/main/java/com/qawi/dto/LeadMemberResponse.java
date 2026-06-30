package com.qawi.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A gym member row in the Super Admin "Leads" gym-directory drill-down.
 * Distinct from {@link MemberLeadResponse} (sales CRM lead).
 */
@Data
@Builder
public class LeadMemberResponse {
    private UUID id;
    private String name;
    private String email;
    private String phone;
    private String status; // ACTIVE | EXPIRED | INACTIVE | PENDING (derived)
    private LocalDate subscriptionStartDate;
    private LocalDate subscriptionEndDate;
    private LocalDateTime joinedAt;
}
