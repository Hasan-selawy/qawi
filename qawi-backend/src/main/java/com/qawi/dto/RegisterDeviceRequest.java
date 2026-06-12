package com.qawi.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RegisterDeviceRequest {
    @NotBlank private String deviceSerial;
    @NotBlank private String deviceName;
    private String deviceModel;
    private String location;
}
