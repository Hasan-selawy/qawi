package com.qawi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/** Expo push token registration payload from the mobile app. */
@Getter
@Setter
public class RegisterMobileTokenRequest {

    @NotBlank(message = "expoPushToken is required")
    @Size(max = 255, message = "expoPushToken too long")
    private String expoPushToken;

    @Size(max = 20, message = "platform too long")
    private String platform;

    @Size(max = 200, message = "deviceName too long")
    private String deviceName;
}
