package com.qawi.dto;

import com.qawi.entity.MemberPlanDuration;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class GymMemberPlanRequest {
    private String name;
    private String nameAr;
    private MemberPlanDuration duration;
    private BigDecimal price;
    private String description;
    private String descriptionAr;
    private Boolean active;
}
