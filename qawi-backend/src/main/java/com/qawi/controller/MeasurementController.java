package com.qawi.controller;

import com.qawi.dto.CreateMeasurementRequest;
import com.qawi.entity.BodyMeasurement;
import com.qawi.exception.AppException;
import com.qawi.service.MeasurementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/measurements")
@RequiredArgsConstructor
public class MeasurementController {

    private final MeasurementService measurementService;

    @PostMapping
    public ResponseEntity<BodyMeasurement> addMeasurement(
            @Valid @RequestBody CreateMeasurementRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(measurementService.addMeasurement(request, userDetails.getUsername()));
    }

    @GetMapping("/member/{memberId}")
    public ResponseEntity<List<BodyMeasurement>> getByMember(@PathVariable UUID memberId) {
        return ResponseEntity.ok(measurementService.getByMember(memberId));
    }

    @GetMapping("/member/{memberId}/latest")
    public ResponseEntity<BodyMeasurement> getLatest(@PathVariable UUID memberId) {
        return ResponseEntity.ok(measurementService.getLatest(memberId)
                .orElseThrow(() -> new AppException(
                        "No measurements found", "لا توجد قياسات", HttpStatus.NOT_FOUND)));
    }
}
