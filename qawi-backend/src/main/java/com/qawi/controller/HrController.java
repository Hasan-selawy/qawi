package com.qawi.controller;

import com.qawi.dto.StaffAttendanceRequest;
import com.qawi.dto.StaffProfileRequest;
import com.qawi.service.HrService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/hr")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('HR','GYM_ADMIN')")
public class HrController {

    private final HrService hrService;

    @GetMapping("/staff")
    public ResponseEntity<List<Map<String, Object>>> getAllStaff(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(hrService.getAllStaff(ud.getUsername()));
    }

    @PostMapping("/staff/{userId}/profile")
    public ResponseEntity<Map<String, Object>> upsertProfile(
            @PathVariable UUID userId,
            @Valid @RequestBody StaffProfileRequest req,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(hrService.upsertProfile(ud.getUsername(), userId, req));
    }

    @GetMapping("/staff/{userId}/attendance")
    public ResponseEntity<List<Map<String, Object>>> getStaffAttendance(
            @PathVariable UUID userId,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(hrService.getStaffAttendance(ud.getUsername(), userId));
    }

    @PostMapping("/staff/{userId}/attendance")
    public ResponseEntity<Map<String, Object>> logAttendance(
            @PathVariable UUID userId,
            @Valid @RequestBody StaffAttendanceRequest req,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(hrService.logAttendance(ud.getUsername(), userId, req));
    }

    @GetMapping("/attendance/today")
    public ResponseEntity<Map<String, Object>> getTodayAttendance(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(hrService.getTodayAttendance(ud.getUsername()));
    }

    @GetMapping("/reports/attendance")
    public ResponseEntity<Map<String, Object>> getAttendanceReport(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(hrService.getAttendanceReport(ud.getUsername()));
    }

    @GetMapping("/staff/{coachId}/performance")
    public ResponseEntity<Map<String, Object>> getCoachPerformance(
            @PathVariable UUID coachId,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(hrService.getCoachPerformance(ud.getUsername(), coachId));
    }

    @GetMapping("/performance")
    public ResponseEntity<List<Map<String, Object>>> getAllCoachPerformance(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(hrService.getAllCoachPerformance(ud.getUsername()));
    }
}
