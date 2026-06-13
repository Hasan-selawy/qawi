package com.qawi.dto;

import com.qawi.entity.Role;
import com.qawi.entity.User;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class UserDto {
    private UUID id;
    private String name;
    private String email;
    private Role role;
    private UUID gymId;
    private boolean isActive;
    private boolean selfTrainingEnabled;
    private LocalDate subscriptionStartDate;
    private LocalDate subscriptionEndDate;
    private LocalDateTime createdAt;

    public static UserDto from(User user) {
        return UserDto.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .gymId(user.getGymId())
                .isActive(user.isActive())
                .selfTrainingEnabled(user.isSelfTrainingEnabled())
                .subscriptionStartDate(user.getSubscriptionStartDate())
                .subscriptionEndDate(user.getSubscriptionEndDate())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
