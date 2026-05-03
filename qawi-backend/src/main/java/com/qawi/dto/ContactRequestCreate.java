package com.qawi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class ContactRequestCreate {
    @NotBlank(message = "Full name is required")
    private String fullName;

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^(?:\\+962|0)7[7-9]\\d{7}$", message = "Invalid Jordanian phone number")
    private String phoneNumber;

    @NotBlank(message = "Gym name is required")
    private String gymName;

    @NotBlank(message = "City is required")
    private String city;

    private String message;
}
