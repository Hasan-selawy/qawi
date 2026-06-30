package com.qawi.dto;

import com.qawi.entity.AudienceSegment;
import com.qawi.entity.NotificationCategory;
import com.qawi.entity.NotificationPriority;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

/** Admin-authored broadcast scheduled to fan out at a future time. */
@Getter
@Setter
public class ScheduleNotificationRequest {

    @NotBlank(message = "titleEn is required")
    @Size(max = 140, message = "titleEn too long")
    private String titleEn;

    @NotBlank(message = "titleAr is required")
    @Size(max = 140, message = "titleAr too long")
    private String titleAr;

    @NotBlank(message = "bodyEn is required")
    @Size(max = 1000, message = "bodyEn too long")
    private String bodyEn;

    @NotBlank(message = "bodyAr is required")
    @Size(max = 1000, message = "bodyAr too long")
    private String bodyAr;

    @NotNull(message = "audience is required")
    private AudienceSegment audience;

    /** Required only when {@link #audience} is SPECIFIC_MEMBER. */
    private UUID targetUserId;

    private NotificationPriority priority;

    private NotificationCategory category;

    @Size(max = 500, message = "actionUrl too long")
    private String actionUrl;

    @NotNull(message = "scheduledAt is required")
    @Future(message = "scheduledAt must be in the future")
    private LocalDateTime scheduledAt;
}
