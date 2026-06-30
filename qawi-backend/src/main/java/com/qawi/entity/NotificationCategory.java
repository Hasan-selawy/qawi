package com.qawi.entity;

/**
 * High-level grouping of notifications. Drives per-user category preferences
 * and client-side filtering. Independent of the finer-grained NotificationType.
 */
public enum NotificationCategory {
    MEMBERSHIP,
    ATTENDANCE,
    CLASS,
    WORKOUT,
    NUTRITION,
    MEASUREMENT,
    ADMIN_ALERT,
    BROADCAST,
    GENERAL
}
