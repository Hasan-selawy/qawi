package com.qawi.dto;

import lombok.Data;

@Data
public class GymFeaturesRequest {
    private Boolean nutritionEnabled;
    private Boolean pushNotificationsEnabled;
    private Boolean customBrandingEnabled;
    private Boolean classBookingEnabled;
    private Boolean analyticsAdvancedEnabled;
    private String nutritionWorkflow;
}
