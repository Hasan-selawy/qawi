package com.qawi.dto;

import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalTime;

/**
 * Partial update for a user's notification preferences. Every field is optional
 * (nullable wrapper types); only non-null fields are applied.
 */
@Getter
@Setter
public class NotificationPreferenceRequest {

    // Channels
    private Boolean inAppEnabled;
    private Boolean browserPushEnabled;
    private Boolean mobilePushEnabled;

    // Category opt-outs
    private Boolean membershipEnabled;
    private Boolean attendanceEnabled;
    private Boolean classEnabled;
    private Boolean workoutEnabled;
    private Boolean nutritionEnabled;
    private Boolean adminAlertsEnabled;
    private Boolean broadcastEnabled;

    @Pattern(regexp = "EN|AR", message = "preferredLanguage must be EN or AR")
    private String preferredLanguage;

    private LocalTime quietHoursStart;
    private LocalTime quietHoursEnd;
}
