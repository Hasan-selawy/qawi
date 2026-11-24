package com.qawi.dto;
import com.qawi.entity.Attendance;
import java.util.UUID;
public record AttendanceOperationResponse(UUID idempotencyKey, Attendance attendance) {}
