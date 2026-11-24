package com.qawi.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qawi.dto.AttendanceOperationRequest;
import com.qawi.dto.AttendanceOperationResponse;
import com.qawi.entity.*;
import com.qawi.exception.AppException;
import com.qawi.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.*;
import java.util.HexFormat;
import java.util.Map;

@Service @RequiredArgsConstructor
public class AttendanceOperationService {
    private final UserRepository users;
    private final AttendanceOperationRepository operations;
    private final AttendanceService attendance;
    private final ObjectMapper mapper;
    @Value("${qawi.attendance.max-offline-days:7}") private int maxOfflineDays;

    @Transactional
    public AttendanceOperationResponse apply(String email, AttendanceOperationRequest request) {
        User user = users.findForUpdateByEmail(email)
                .orElseThrow(() -> new AppException("Member not found", "العضو غير موجود", HttpStatus.NOT_FOUND));
        if (user.getRole() != Role.MEMBER) throw new AppException("Access denied", "غير مصرح", HttpStatus.FORBIDDEN);
        String hash = hash(request.operation() + ":" + request.occurredAt());
        var previous = operations.findByMemberIdAndIdempotencyKey(user.getId(), request.idempotencyKey());
        if (previous.isPresent()) {
            if (!previous.get().getRequestHash().equals(hash))
                throw new AppException("Idempotency key was used for a different operation", "مفتاح العملية مستخدم لطلب مختلف", HttpStatus.CONFLICT);
            try { return mapper.readValue(previous.get().getResponseJson(), AttendanceOperationResponse.class); }
            catch (java.io.IOException error) { throw new IllegalStateException("Stored attendance response is invalid", error); }
        }
        Instant now = Instant.now();
        if (request.occurredAt().isAfter(now.plusSeconds(300))
                || request.occurredAt().isBefore(now.minus(Duration.ofDays(maxOfflineDays))))
            throw new AppException("Offline operation is outside the accepted time window", "وقت العملية خارج المدة المسموحة", HttpStatus.BAD_REQUEST);
        LocalDateTime occurredAt = LocalDateTime.ofInstant(request.occurredAt(), ZoneId.systemDefault());
        Attendance record = request.operation() == AttendanceOperationRequest.Operation.CHECKIN
                ? attendance.checkInAt(email, occurredAt).getAttendance() : attendance.checkOutAt(email, occurredAt);
        AttendanceOperationResponse response = new AttendanceOperationResponse(request.idempotencyKey(), record);
        String serialized;
        try { serialized = mapper.writeValueAsString(response); }
        catch (java.io.IOException error) { throw new IllegalStateException("Attendance response could not be serialized", error); }
        operations.save(AttendanceOperation.builder().memberId(user.getId()).idempotencyKey(request.idempotencyKey())
                .requestHash(hash).responseJson(serialized).build());
        return response;
    }

    private String hash(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (java.security.NoSuchAlgorithmException error) { throw new IllegalStateException(error); }
    }
}
