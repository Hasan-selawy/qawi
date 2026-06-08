package com.qawi.dto;

import lombok.Builder;
import lombok.Data;

@Data @Builder
public class ReceptionTodayStats {
    private long checkedInToday;
    private long expectedToday;
    private long expiringThisWeek;
    private long totalCheckins;
    private long newMembersThisWeek;
}
