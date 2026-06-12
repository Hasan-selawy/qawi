package com.qawi.service;

import com.qawi.dto.EnrollMemberRequest;
import com.qawi.dto.RegisterDeviceRequest;
import com.qawi.entity.*;
import com.qawi.exception.AppException;
import com.qawi.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ZkTecoService {

    private final BiometricDeviceRepository deviceRepo;
    private final BiometricEnrollmentRepository enrollmentRepo;
    private final UserRepository userRepo;
    private final AttendanceRepository attendanceRepo;

    private User loadCaller(String email) {
        User u = userRepo.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));
        if (u.getRole() != Role.GYM_ADMIN && u.getRole() != Role.RECEPTIONIST)
            throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);
        return u;
    }

    @Transactional
    public Map<String, Object> registerDevice(String email, RegisterDeviceRequest req) {
        User admin = loadCaller(email);
        if (admin.getRole() != Role.GYM_ADMIN)
            throw new AppException("Only Gym Admin can register devices",
                    "فقط مسؤول الصالة يمكنه تسجيل الأجهزة", HttpStatus.FORBIDDEN);

        BiometricDevice device = deviceRepo.findByDeviceSerialAndGymId(req.getDeviceSerial(), admin.getGymId())
                .orElseGet(() -> BiometricDevice.builder()
                        .gymId(admin.getGymId())
                        .deviceSerial(req.getDeviceSerial())
                        .build());
        device.setDeviceName(req.getDeviceName());
        device.setDeviceModel(req.getDeviceModel());
        device.setLocation(req.getLocation());
        device.setActive(true);
        device = deviceRepo.save(device);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", device.getId());
        result.put("deviceSerial", device.getDeviceSerial());
        result.put("deviceName", device.getDeviceName());
        result.put("message", "Device registered successfully");
        return result;
    }

    public List<Map<String, Object>> getDevices(String email) {
        User caller = loadCaller(email);
        LocalDateTime tenMinAgo = LocalDateTime.now().minusMinutes(10);
        return deviceRepo.findByGymIdOrderByRegisteredAtDesc(caller.getGymId()).stream().map(d -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", d.getId());
            m.put("deviceSerial", d.getDeviceSerial());
            m.put("deviceName", d.getDeviceName());
            m.put("deviceModel", d.getDeviceModel());
            m.put("location", d.getLocation());
            m.put("isActive", d.isActive());
            m.put("lastSeenAt", d.getLastSeenAt());
            m.put("registeredAt", d.getRegisteredAt());
            m.put("onlineStatus", d.getLastSeenAt() != null && d.getLastSeenAt().isAfter(tenMinAgo) ? "ONLINE" : "OFFLINE");
            return m;
        }).collect(Collectors.toList());
    }

    @Transactional
    public Map<String, Object> enrollMember(String email, UUID memberId, EnrollMemberRequest req) {
        User caller = loadCaller(email);
        User member = userRepo.findById(memberId)
                .orElseThrow(() -> new AppException("Member not found", "العضو غير موجود", HttpStatus.NOT_FOUND));
        if (!caller.getGymId().equals(member.getGymId()))
            throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);

        deviceRepo.findByDeviceSerialAndGymId(req.getDeviceSerial(), caller.getGymId())
                .orElseThrow(() -> new AppException("Device not found in this gym",
                        "الجهاز غير موجود في هذه الصالة", HttpStatus.NOT_FOUND));

        BiometricEnrollment enrollment = enrollmentRepo
                .findByMemberIdAndDeviceSerial(memberId, req.getDeviceSerial())
                .orElseGet(() -> BiometricEnrollment.builder()
                        .gymId(caller.getGymId())
                        .memberId(memberId)
                        .deviceSerial(req.getDeviceSerial())
                        .build());
        enrollment.setDeviceUserId(req.getDeviceUserId());
        enrollment.setTemplateType(req.getTemplateType() != null ? req.getTemplateType() : TemplateType.UNKNOWN);
        enrollment.setActive(true);
        enrollmentRepo.save(enrollment);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("memberId", memberId);
        result.put("memberName", member.getName());
        result.put("deviceSerial", req.getDeviceSerial());
        result.put("deviceUserId", req.getDeviceUserId());
        return result;
    }

    public List<Map<String, Object>> getEnrollments(String email) {
        User caller = loadCaller(email);
        return enrollmentRepo.findByGymIdOrderByEnrolledAtDesc(caller.getGymId()).stream().map(e -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", e.getId());
            m.put("memberId", e.getMemberId());
            userRepo.findById(e.getMemberId()).ifPresent(u -> {
                m.put("memberName", u.getName());
                m.put("memberPhone", u.getPhone());
            });
            m.put("deviceSerial", e.getDeviceSerial());
            m.put("deviceUserId", e.getDeviceUserId());
            m.put("templateType", e.getTemplateType());
            m.put("enrolledAt", e.getEnrolledAt());
            m.put("isActive", e.isActive());
            return m;
        }).collect(Collectors.toList());
    }

    @Transactional
    public String handleAdmsPing(String serial) {
        if (serial != null && !serial.isBlank()) {
            deviceRepo.findByDeviceSerial(serial.trim()).ifPresent(d -> {
                d.setLastSeenAt(LocalDateTime.now());
                deviceRepo.save(d);
            });
        }
        return "ATTLOGStamp=9999\nOPERLOGStamp=9999\nATTPHOTOStamp=9999\n";
    }

    @Transactional
    public String handleAdmsAttendance(Map<String, String> params, String body) {
        String serial = coalesce(params.get("SN"), params.get("device_sn"), params.get("serial"));
        if (serial == null) return "OK";

        Optional<BiometricDevice> deviceOpt = deviceRepo.findByDeviceSerial(serial.trim());
        if (deviceOpt.isEmpty()) {
            log.warn("ZKTeco: unknown device serial '{}'", serial);
            return "OK";
        }
        BiometricDevice device = deviceOpt.get();
        device.setLastSeenAt(LocalDateTime.now());
        deviceRepo.save(device);

        String userId = coalesce(params.get("PIN"), params.get("user_id"), params.get("uid"));

        if (userId == null && body != null && !body.isBlank()) {
            for (String line : body.split("\n")) {
                String trimmed = line.trim();
                if (trimmed.startsWith("ATTLOG")) {
                    String[] parts = trimmed.split("\\s+");
                    if (parts.length >= 2) { userId = parts[1]; break; }
                }
            }
        }
        if (userId == null) return "OK";

        Optional<BiometricEnrollment> enrollOpt = enrollmentRepo
                .findByDeviceSerialAndDeviceUserId(serial.trim(), userId.trim());
        if (enrollOpt.isEmpty()) {
            log.warn("ZKTeco: no enrollment for device='{}' userId='{}'", serial, userId);
            return "OK";
        }

        UUID memberId = enrollOpt.get().getMemberId();
        Optional<User> memberOpt = userRepo.findById(memberId);
        if (memberOpt.isEmpty() || !memberOpt.get().getGymId().equals(device.getGymId())) return "OK";

        LocalDateTime fiveMinAgo = LocalDateTime.now().minusMinutes(5);
        boolean recentCheckin = !attendanceRepo
                .findByMemberIdAndCheckedInAtAfterOrderByCheckedInAtDesc(memberId, fiveMinAgo).isEmpty();
        if (recentCheckin) return "OK";

        Attendance att = Attendance.builder()
                .memberId(memberId)
                .gymId(device.getGymId())
                .checkedInAt(LocalDateTime.now())
                .source("ZKTECO")
                .build();
        attendanceRepo.save(att);
        log.info("ZKTeco: checked in member '{}' via device '{}'", memberId, serial);
        return "OK";
    }

    private String coalesce(String... values) {
        for (String v : values) { if (v != null && !v.isBlank()) return v.trim(); }
        return null;
    }
}
