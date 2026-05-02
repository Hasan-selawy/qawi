package com.qawi.gym.controller;

import com.qawi.gym.dto.request.AttendanceRequest;
import com.qawi.gym.dto.response.ApiResponse;
import com.qawi.gym.dto.response.AttendanceResponse;
import com.qawi.gym.dto.response.PageResponse;
import com.qawi.gym.service.AttendanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;

    @PostMapping("/check-in")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'GYM_OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<AttendanceResponse>> checkIn(@Valid @RequestBody AttendanceRequest request) {
        AttendanceResponse response = attendanceService.checkIn(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Check-in recorded", response));
    }

    @PostMapping("/check-out/{memberId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'GYM_OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<AttendanceResponse>> checkOut(@PathVariable Long memberId) {
        return ResponseEntity.ok(ApiResponse.success("Check-out recorded",
                attendanceService.checkOut(memberId)));
    }

    @GetMapping("/member/{memberId}")
    public ResponseEntity<ApiResponse<PageResponse<AttendanceResponse>>> getMemberAttendance(
            @PathVariable Long memberId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("checkInTime").descending());
        return ResponseEntity.ok(ApiResponse.success(attendanceService.getMemberAttendance(memberId, pageable)));
    }

    @GetMapping("/gym/{gymId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'GYM_OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<PageResponse<AttendanceResponse>>> getGymAttendance(
            @PathVariable Long gymId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("checkInTime").descending());
        return ResponseEntity.ok(ApiResponse.success(attendanceService.getGymAttendance(gymId, pageable)));
    }
}
