package com.qawi.service;

import com.qawi.entity.Role;
import com.qawi.entity.User;

import java.time.LocalDate;

/**
 * Single source of truth for a member's derived subscription status and the
 * access-lock rule.
 *
 * <p>A member keeps full access for a {@link #GRACE_PERIOD_DAYS}-day grace window
 * after their subscription end date. Only once the subscription ended more than
 * the grace window ago is access locked. Status is always <em>computed</em>
 * (never persisted), so renewing a subscription to a future end date instantly
 * restores ACTIVE / unlocked state with no migration or background job.
 *
 * <p>Boundary (with {@code graceCutoff = today - GRACE_PERIOD_DAYS}):
 * <ul>
 *   <li>{@code end >= today} &rarr; ACTIVE</li>
 *   <li>{@code graceCutoff <= end < today} &rarr; GRACE_PERIOD (still accessible)</li>
 *   <li>{@code end < graceCutoff} (4+ days ago) &rarr; EXPIRED / LOCKED</li>
 * </ul>
 */
public final class SubscriptionStatusUtil {

    /** Days after the subscription end date during which access is still allowed. */
    public static final int GRACE_PERIOD_DAYS = 3;

    public enum Status { ACTIVE, GRACE_PERIOD, EXPIRED, PENDING, INACTIVE }

    private SubscriptionStatusUtil() {}

    /** Cutoff before which an expired subscription is locked ({@code end < cutoff => locked}). */
    public static LocalDate graceCutoff(LocalDate today) {
        return today.minusDays(GRACE_PERIOD_DAYS);
    }

    /** Derived, grace-period-aware status for display. */
    public static Status compute(User user, LocalDate today) {
        if (!user.isActive()) return Status.INACTIVE;
        LocalDate end = user.getSubscriptionEndDate();
        if (end == null) return Status.PENDING;
        if (!end.isBefore(today)) return Status.ACTIVE;                 // end >= today
        if (!end.isBefore(graceCutoff(today))) return Status.GRACE_PERIOD; // today-3 <= end < today
        return Status.EXPIRED;                                          // end < today-3 (locked)
    }

    /**
     * Whether a member's access should be locked (login + all member endpoints).
     * Only MEMBER subscriptions lock; non-members, members with no end date
     * (never subscribed) and grace-window members are never locked here.
     * Admin-deactivated accounts ({@code isActive=false}) are handled separately.
     */
    public static boolean isLockedForAccess(User user, LocalDate today) {
        if (user.getRole() != Role.MEMBER) return false;
        LocalDate end = user.getSubscriptionEndDate();
        if (end == null) return false;
        return end.isBefore(graceCutoff(today));
    }
}
