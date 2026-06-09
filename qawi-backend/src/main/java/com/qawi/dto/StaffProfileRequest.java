package com.qawi.dto;

import com.qawi.entity.EmploymentType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class StaffProfileRequest {
    @NotNull private String jobTitle;
    private LocalDate startDate;
    private BigDecimal salary;
    private EmploymentType employmentType;
    private String emergencyContact;
    private String notes;
}
