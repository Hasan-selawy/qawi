package com.qawi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/** Web Push (browser) subscription payload produced by the PushManager API. */
@Getter
@Setter
public class RegisterWebPushRequest {

    @NotBlank(message = "endpoint is required")
    private String endpoint;

    @NotBlank(message = "p256dh key is required")
    private String p256dh;

    @NotBlank(message = "auth key is required")
    private String auth;

    @Size(max = 500, message = "userAgent too long")
    private String userAgent;
}
