package com.qawi.controller;

import com.qawi.dto.EnrollMemberRequest;
import com.qawi.dto.RegisterDeviceRequest;
import com.qawi.service.ZkTecoService;
import jakarta.validation.Valid;
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
@RequiredArgsConstructor
public class ZkTecoController {

    private final ZkTecoService zkTecoService;

    @PostMapping("/api/v1/zkteco/devices/register")
    @PreAuthorize("hasRole('GYM_ADMIN')")
    public ResponseEntity<Map<String, Object>> registerDevice(
            @Valid @RequestBody RegisterDeviceRequest req,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.status(HttpStatus.CREATED).body(zkTecoService.registerDevice(ud.getUsername(), req));
    }

    @GetMapping("/api/v1/zkteco/devices")
    @PreAuthorize("hasAnyRole('GYM_ADMIN','RECEPTIONIST')")
    public ResponseEntity<List<Map<String, Object>>> getDevices(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(zkTecoService.getDevices(ud.getUsername()));
    }

    @PostMapping("/api/v1/zkteco/members/{memberId}/enroll")
    @PreAuthorize("hasAnyRole('GYM_ADMIN','RECEPTIONIST')")
    public ResponseEntity<Map<String, Object>> enrollMember(
            @PathVariable UUID memberId,
            @Valid @RequestBody EnrollMemberRequest req,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(zkTecoService.enrollMember(ud.getUsername(), memberId, req));
    }

    @GetMapping("/api/v1/zkteco/enrollments")
    @PreAuthorize("hasAnyRole('GYM_ADMIN','RECEPTIONIST')")
    public ResponseEntity<List<Map<String, Object>>> getEnrollments(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(zkTecoService.getEnrollments(ud.getUsername()));
    }

    @GetMapping({"/api/v1/zkteco/adms", "/iclock/cdata", "/iclock/getrequest"})
    public ResponseEntity<String> admsPing(
            @RequestParam(required = false, name = "SN") String sn,
            @RequestParam(required = false, name = "device_sn") String deviceSn,
            @RequestParam(required = false) String serial) {
        String s = coalesce(sn, deviceSn, serial);
        return ResponseEntity.ok().header("Content-Type", "text/plain").body(zkTecoService.handleAdmsPing(s));
    }

    @PostMapping({"/api/v1/zkteco/adms", "/iclock/cdata", "/iclock/devicecmd"})
    public ResponseEntity<String> admsAttendance(
            @RequestParam(required = false) Map<String, String> params,
            @RequestBody(required = false) String body) {
        if (params == null) params = Map.of();
        return ResponseEntity.ok().header("Content-Type", "text/plain")
                .body(zkTecoService.handleAdmsAttendance(params, body));
    }

    private String coalesce(String... values) {
        for (String v : values) { if (v != null && !v.isBlank()) return v.trim(); }
        return null;
    }
}
