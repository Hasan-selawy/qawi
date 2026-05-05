package com.qawi.dto;

import com.qawi.entity.MemberPlanDuration;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GymMemberPlanDto {
    private UUID id;
    private UUID gymId;
    private String name;
    private String nameAr;
    private MemberPlanDuration duration;
    private String durationLabel;
    private String durationLabelAr;
    private BigDecimal price;
    private String description;
    private String descriptionAr;
    private boolean active;
}
