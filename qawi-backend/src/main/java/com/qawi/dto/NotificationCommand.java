package com.qawi.dto;

import com.qawi.entity.NotificationCategory;
import com.qawi.entity.NotificationPriority;
import com.qawi.entity.NotificationType;
import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

/**
 * Internal command describing a single in-app notification to create. Not an
 * API contract — used to funnel every notification (legacy, automatic,
 * scheduled, manual) through one dispatch path in {@code NotificationService}.
 */
@Getter
@Builder
public class NotificationCommand {

    /** Recipient user id (required). */
    private final UUID userId;

    /** Recipient gym; resolved from the user when null. */
    private final UUID gymId;

    private final NotificationType type;

    /** Optional; derived from {@link #type} when null. */
    private final NotificationCategory category;

    /** Optional; defaults to NORMAL when null. */
    private final NotificationPriority priority;

    private final String titleEn;
    private final String titleAr;
    private final String message;
    private final String messageAr;
    private final String actionUrl;

    /** When set, enables idempotent delivery via the delivery log. */
    private final String uniqueKey;
}
