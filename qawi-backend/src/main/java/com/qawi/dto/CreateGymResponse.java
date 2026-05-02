package com.qawi.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CreateGymResponse {
    private GymDetailResponse gym;
    private UserDto admin;
}
