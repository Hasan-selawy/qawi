package com.qawi.gym.dto.response;

import com.qawi.gym.entity.enums.Gender;
import com.qawi.gym.entity.enums.MemberStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class MemberResponse {
    private Long id;
    private String memberCode;
    private Long gymId;
    private String gymName;
    private Long userId;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private LocalDate dateOfBirth;
    private Gender gender;
    private String profilePhotoUrl;
    private String emergencyContactName;
    private String emergencyContactPhone;
    private String healthNotes;
    private MemberStatus status;
    private LocalDateTime createdAt;
}
