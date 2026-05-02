package com.qawi.gym.dto.response;

import com.qawi.gym.entity.enums.GymStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class GymResponse {
    private Long id;
    private String name;
    private String nameAr;
    private String address;
    private String city;
    private String country;
    private String phone;
    private String email;
    private String logoUrl;
    private GymStatus status;
    private Long ownerId;
    private Integer maxMembers;
    private Long activeMembers;
    private LocalDateTime createdAt;
}
