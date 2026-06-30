package com.qawi.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

/**
 * Partial update for a gym's automatic-notification settings. Every field is
 * optional; only non-null fields are applied.
 */
@Getter
@Setter
public class NotificationSettingRequest {

    private Boolean membershipExpiryEnabled;

    /** CSV of "days before expiry", e.g. "7,3,1". */
    @Pattern(regexp = "^\\d{1,3}(,\\d{1,3})*$", message = "expiryReminderDays must be a comma-separated list of numbers")
    private String expiryReminderDays;

    private Boolean expiredAlertEnabled;

    private Boolean inactiveMemberEnabled;

    @Min(value = 1, message = "inactiveAfterDays must be at least 1")
    @Max(value = 365, message = "inactiveAfterDays must be at most 365")
    private Integer inactiveAfterDays;

    private Boolean classReminderEnabled;

    @Min(value = 5, message = "classReminderMinutesBefore must be at least 5")
    @Max(value = 1440, message = "classReminderMinutesBefore must be at most 1440")
    private Integer classReminderMinutesBefore;

    private Boolean adminAlertsEnabled;
}
