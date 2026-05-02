package com.qawi.gym.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class GymRequest {

    @NotBlank(message = "Gym name is required")
    private String name;

    private String nameAr;
    private String address;
    private String city;
    private String country;

    @Email(message = "Invalid email format")
    private String email;

    private String phone;
    private String logoUrl;
    private Integer maxMembers;
}
