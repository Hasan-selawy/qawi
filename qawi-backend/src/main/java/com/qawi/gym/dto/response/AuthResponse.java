package com.qawi.gym.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.qawi.gym.entity.enums.Role;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AuthResponse {
    private String accessToken;
    private String refreshToken;
    private String tokenType;
    private Long expiresIn;
    private Long userId;
    private String email;
    private String fullName;
    private Role role;
    private Long gymId;
}
