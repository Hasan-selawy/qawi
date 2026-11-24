package com.qawi.dto;

import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;

public record AttendanceOperationRequest(@NotNull UUID idempotencyKey, @NotNull Operation operation,
                                         @NotNull Instant occurredAt) {
    public enum Operation { CHECKIN, CHECKOUT }
}
