package com.qawi.entity;

/**
 * Target audience for an admin-initiated (manual or scheduled) notification.
 * Resolution is always scoped to the sender's gym.
 */
public enum AudienceSegment {
    ALL_MEMBERS,
    ACTIVE_MEMBERS,
    EXPIRING_MEMBERS,
    EXPIRED_MEMBERS,
    INACTIVE_MEMBERS,
    COACHES,
    ALL_STAFF,
    ALL_USERS,
    SPECIFIC_MEMBER
}
