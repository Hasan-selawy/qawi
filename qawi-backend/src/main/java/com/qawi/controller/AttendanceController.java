package com.qawi.controller;

import com.qawi.dto.CheckInResponse;
import com.qawi.dto.StreakResponse;
import com.qawi.entity.Attendance;
import com.qawi.service.AttendanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;

    @PostMapping("/checkin")
    @PreAuthorize("hasRole('MEMBER')")
    public ResponseEntity<CheckInResponse> checkIn(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(attendanceService.checkIn(userDetails.getUsername()));
    }

    @GetMapping("/member/{memberId}")
    public ResponseEntity<List<Attendance>> getByMember(@PathVariable UUID memberId) {
        return ResponseEntity.ok(attendanceService.getByMember(memberId));
    }

    @GetMapping("/member/{memberId}/streak")
    public ResponseEntity<StreakResponse> getStreak(@PathVariable UUID memberId) {
        return ResponseEntity.ok(attendanceService.getStreak(memberId));
    }
}
