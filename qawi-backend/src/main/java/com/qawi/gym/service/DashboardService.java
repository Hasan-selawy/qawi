package com.qawi.gym.service;

import com.qawi.gym.dto.response.DashboardResponse;
import com.qawi.gym.entity.enums.ClassStatus;
import com.qawi.gym.entity.enums.MemberStatus;
import com.qawi.gym.entity.enums.SubscriptionStatus;
import com.qawi.gym.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final MemberRepository memberRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final PaymentRepository paymentRepository;
    private final AttendanceRepository attendanceRepository;
    private final GymClassRepository classRepository;

    @Transactional(readOnly = true)
    public DashboardResponse getGymDashboard(Long gymId) {
        long totalMembers = memberRepository.countByGymIdAndStatus(gymId, MemberStatus.ACTIVE)
                          + memberRepository.countByGymIdAndStatus(gymId, MemberStatus.INACTIVE)
                          + memberRepository.countByGymIdAndStatus(gymId, MemberStatus.SUSPENDED);
        long activeMembers = memberRepository.countByGymIdAndStatus(gymId, MemberStatus.ACTIVE);
        long activeSubscriptions = subscriptionRepository.countByMemberGymIdAndStatus(gymId, SubscriptionStatus.ACTIVE);
        long expiredSubscriptions = subscriptionRepository.countByMemberGymIdAndStatus(gymId, SubscriptionStatus.EXPIRED);

        YearMonth thisMonth = YearMonth.now();
        YearMonth lastMonth = thisMonth.minusMonths(1);

        BigDecimal revenueThisMonth = paymentRepository.sumRevenueByGymIdAndDateRange(
                gymId,
                thisMonth.atDay(1).atStartOfDay(),
                thisMonth.atEndOfMonth().atTime(23, 59, 59));

        BigDecimal revenueLastMonth = paymentRepository.sumRevenueByGymIdAndDateRange(
                gymId,
                lastMonth.atDay(1).atStartOfDay(),
                lastMonth.atEndOfMonth().atTime(23, 59, 59));

        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime todayEnd = LocalDate.now().atTime(23, 59, 59);
        LocalDateTime weekStart = LocalDate.now().minusDays(7).atStartOfDay();

        long attendanceToday = attendanceRepository.countByGymIdAndDateRange(gymId, todayStart, todayEnd);
        long attendanceThisWeek = attendanceRepository.countByGymIdAndDateRange(gymId, weekStart, todayEnd);

        long upcomingClasses = classRepository.findByGymIdAndDateRange(gymId, LocalDateTime.now(),
                LocalDateTime.now().plusDays(7)).size();

        List<com.qawi.gym.entity.Subscription> expiringSoon = subscriptionRepository.findExpiringBetween(
                LocalDate.now(), LocalDate.now().plusDays(7));
        long expiringSubscriptions = expiringSoon.size();

        return DashboardResponse.builder()
                .totalMembers(totalMembers)
                .activeMembers(activeMembers)
                .activeSubscriptions(activeSubscriptions)
                .expiredSubscriptions(expiredSubscriptions)
                .revenueThisMonth(revenueThisMonth != null ? revenueThisMonth : BigDecimal.ZERO)
                .revenueLastMonth(revenueLastMonth != null ? revenueLastMonth : BigDecimal.ZERO)
                .attendanceToday(attendanceToday)
                .attendanceThisWeek(attendanceThisWeek)
                .upcomingClasses(upcomingClasses)
                .expiringSubscriptions(expiringSubscriptions)
                .build();
    }
}
