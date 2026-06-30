package com.qawi.entity;

public enum NotificationType {
    // ── Existing (do not rename) ──────────────────────────────────────────
    MISSED_DAYS,
    SUBSCRIPTION_ALERT,
    DAY_COMPLETED,
    MEASUREMENT_ADDED,

    // ── Membership / subscription workflow ────────────────────────────────
    MEMBERSHIP_EXPIRING,
    MEMBERSHIP_EXPIRED,
    RENEWAL_REMINDER,
    RENEWAL_REQUEST,

    // ── Attendance ────────────────────────────────────────────────────────
    INACTIVE_MEMBER,

    // ── Classes ───────────────────────────────────────────────────────────
    CLASS_REMINDER,
    CLASS_BOOKING_CONFIRMED,
    CLASS_CANCELLED,

    // ── Admin-facing alerts ───────────────────────────────────────────────
    NEW_MEMBER,
    COACH_ASSIGNED,
    REPORT_SUBMITTED,
    ADMIN_ALERT,

    // ── Manual broadcast ──────────────────────────────────────────────────
    MANUAL_BROADCAST
}
