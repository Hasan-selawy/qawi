package com.qawi.service;

import com.qawi.entity.Role;
import com.qawi.entity.User;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Boundary tests for the 3-day grace period: active, expired by 1 day, expired
 * by 3 days (last grace day), expired by 4+ days (locked), plus pending /
 * inactive / non-member edge cases.
 */
class SubscriptionStatusUtilTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 6, 30);

    private static User member(LocalDate end, boolean active) {
        return User.builder()
                .name("Test").email("t@example.com").password("pw")
                .role(Role.MEMBER).isActive(active).subscriptionEndDate(end)
                .build();
    }

    @Test
    void activeWhenEndDateIsToday() {
        User u = member(TODAY, true);
        assertEquals(SubscriptionStatusUtil.Status.ACTIVE, SubscriptionStatusUtil.compute(u, TODAY));
        assertFalse(SubscriptionStatusUtil.isLockedForAccess(u, TODAY));
    }

    @Test
    void activeWhenEndDateInFuture() {
        User u = member(TODAY.plusDays(30), true);
        assertEquals(SubscriptionStatusUtil.Status.ACTIVE, SubscriptionStatusUtil.compute(u, TODAY));
        assertFalse(SubscriptionStatusUtil.isLockedForAccess(u, TODAY));
    }

    @Test
    void gracePeriodWhenExpiredByOneDay() {
        User u = member(TODAY.minusDays(1), true);
        assertEquals(SubscriptionStatusUtil.Status.GRACE_PERIOD, SubscriptionStatusUtil.compute(u, TODAY));
        assertFalse(SubscriptionStatusUtil.isLockedForAccess(u, TODAY));
    }

    @Test
    void gracePeriodWhenExpiredByExactlyThreeDays() {
        User u = member(TODAY.minusDays(3), true);
        assertEquals(SubscriptionStatusUtil.Status.GRACE_PERIOD, SubscriptionStatusUtil.compute(u, TODAY));
        assertFalse(SubscriptionStatusUtil.isLockedForAccess(u, TODAY));
    }

    @Test
    void lockedWhenExpiredByFourDays() {
        User u = member(TODAY.minusDays(4), true);
        assertEquals(SubscriptionStatusUtil.Status.EXPIRED, SubscriptionStatusUtil.compute(u, TODAY));
        assertTrue(SubscriptionStatusUtil.isLockedForAccess(u, TODAY));
    }

    @Test
    void lockedWhenLongExpired() {
        User u = member(TODAY.minusDays(90), true);
        assertEquals(SubscriptionStatusUtil.Status.EXPIRED, SubscriptionStatusUtil.compute(u, TODAY));
        assertTrue(SubscriptionStatusUtil.isLockedForAccess(u, TODAY));
    }

    @Test
    void pendingWhenNoEndDate() {
        User u = member(null, true);
        assertEquals(SubscriptionStatusUtil.Status.PENDING, SubscriptionStatusUtil.compute(u, TODAY));
        assertFalse(SubscriptionStatusUtil.isLockedForAccess(u, TODAY));
    }

    @Test
    void inactiveOverridesDateStatus() {
        User u = member(TODAY.minusDays(10), false);
        assertEquals(SubscriptionStatusUtil.Status.INACTIVE, SubscriptionStatusUtil.compute(u, TODAY));
    }

    @Test
    void nonMemberIsNeverLockedForAccess() {
        User coach = User.builder()
                .name("Coach").email("coach@example.com").password("pw")
                .role(Role.COACH).isActive(true).subscriptionEndDate(TODAY.minusDays(365))
                .build();
        assertFalse(SubscriptionStatusUtil.isLockedForAccess(coach, TODAY));
    }
}
