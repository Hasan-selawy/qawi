package com.qawi.dto;

import com.qawi.entity.NutritionGoal;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class NutritionTargetRequest {
    @NotNull private UUID memberId;
    @Min(0) private int calories;
    @Min(0) private int proteinG;
    @Min(0) private int carbsG;
    @Min(0) private int fatG;
    @Min(0) private int waterMl;
    private NutritionGoal goal;
}
