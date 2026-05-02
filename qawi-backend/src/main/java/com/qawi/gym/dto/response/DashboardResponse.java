package com.qawi.gym.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class DashboardResponse {
    private Long totalMembers;
    private Long activeMembers;
    private Long expiredSubscriptions;
    private Long activeSubscriptions;
    private BigDecimal revenueThisMonth;
    private BigDecimal revenueLastMonth;
    private Long attendanceToday;
    private Long attendanceThisWeek;
    private Long upcomingClasses;
    private Long expiringSubscriptions;
}
