package com.qawi.gym.dto.request;

import com.qawi.gym.entity.enums.Gender;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class MemberRequest {

    @NotBlank(message = "First name is required")
    private String firstName;

    @NotBlank(message = "Last name is required")
    private String lastName;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    private String password;
    private String phone;
    private LocalDate dateOfBirth;
    private Gender gender;
    private String profilePhotoUrl;
    private String emergencyContactName;
    private String emergencyContactPhone;
    private String healthNotes;

    @NotNull(message = "Gym ID is required")
    private Long gymId;
}
