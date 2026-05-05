package com.qawi.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
public class AdminAnalyticsResponse {
    private long totalMembers;
    private long activeMembers;
    private long inactiveMembers;
    private long totalCoaches;
    private long expiringThisWeek;
    private long expiredMembers;
    private double avgWorkoutsPerMember;
    private List<Map<String, Object>> attendanceThisWeek;
    private List<Map<String, Object>> topPerformingMembers;
    private double revenueThisMonth;
    private List<Map<String, Object>> memberGrowth;
    private List<Map<String, Object>> monthlyRevenue;
    private List<Map<String, Object>> weeklyAttendanceByDay;
}
