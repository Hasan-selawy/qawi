package com.qawi.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class GymLeadSummaryResponse {
    private UUID id;
    private String name;
    private String ownerName;
    private String contactEmail;
    private String contactPhone;
    private LocalDateTime registeredAt;
    private long totalMembers;
    private long activeMembers;
    private long graceMembers;
    private long expiredMembers;
    private long inactiveMembers;
    private long pendingMembers;
}
