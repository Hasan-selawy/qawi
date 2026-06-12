package com.qawi.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CrmRenewRequest {
    @NotNull private LocalDate subscriptionEndDate;
}
