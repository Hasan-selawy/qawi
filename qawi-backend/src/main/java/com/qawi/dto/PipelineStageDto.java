package com.qawi.dto;

import com.qawi.entity.GymLeadStatus;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PipelineStageDto {
    private GymLeadStatus status;
    private long count;
}
