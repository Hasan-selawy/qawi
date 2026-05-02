package com.qawi.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PlatformStatsResponse {
    private long totalGyms;
    private long totalMembers;
    private long totalCoaches;
    private long activeGyms;
    private long expiringGyms;
}
