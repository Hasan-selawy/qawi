package com.qawi.dto;

import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class CopyDayRequest {
    private List<LocalDate> copyToDates;
    private LocalDate copyToRangeStart;
    private LocalDate copyToRangeEnd;
}
