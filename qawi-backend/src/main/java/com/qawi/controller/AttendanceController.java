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
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;

    // ───────── Member self-routes ─────────

    @PostMapping("/me/checkin")
    @PreAuthorize("hasRole('MEMBER')")
    public ResponseEntity<CheckInResponse> myCheckin(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(attendanceService.checkIn(ud.getUsername()));
    }

    @PostMapping("/me/checkout")
    @PreAuthorize("hasRole('MEMBER')")
    public ResponseEntity<Attendance> myCheckout(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(attendanceService.checkOut(ud.getUsername()));
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('MEMBER')")
    public ResponseEntity<List<Map<String, Object>>> myAttendance(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(attendanceService.getMyAttendance(ud.getUsername()));
    }

    @GetMapping("/me/stats")
    @PreAuthorize("hasRole('MEMBER')")
    public ResponseEntity<Map<String, Object>> myStats(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(attendanceService.getMyStats(ud.getUsername()));
    }

    // ───────── Coach / admin views ─────────

    @GetMapping("/member/{memberId}")
    @PreAuthorize("hasAnyRole('COACH','GYM_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<List<Attendance>> getByMember(
            @PathVariable UUID memberId,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(attendanceService.getByMember(memberId, ud.getUsername()));
    }

    @GetMapping("/member/{memberId}/streak")
    @PreAuthorize("hasAnyRole('COACH','GYM_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<StreakResponse> getStreak(
            @PathVariable UUID memberId,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(attendanceService.getStreakForCaller(memberId, ud.getUsername()));
    }
}
