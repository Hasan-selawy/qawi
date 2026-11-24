package com.qawi.service;

import com.qawi.entity.*;
import com.qawi.repository.*;
import com.qawi.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class PrivacyService {
    private final UserRepository users;
    private final BodyMeasurementRepository measurements;
    private final BiometricEnrollmentRepository enrollments;
    private final BiometricErasureJobRepository erasures;

    @Transactional(readOnly = true)
    public Map<String, Object> exportSelf(String email) {
        User user = member(email);
        return Map.of("exportedAt", LocalDateTime.now(), "memberId", user.getId(),
                "measurements", measurements.findByMemberIdOrderByRecordedAtDesc(user.getId()),
                "biometricEnrollments", enrollments.findByMemberId(user.getId()),
                "pendingDeviceErasures", erasures.findByMemberIdAndConfirmedAtIsNull(user.getId()));
    }

    @Transactional
    public Map<String, Object> deleteSelf(String email, boolean deleteMeasurements, boolean deleteBiometrics) {
        User user = users.findForUpdateByEmail(email).orElseThrow(this::notFound);
        if (user.getRole() != Role.MEMBER) throw forbidden();
        if (!deleteMeasurements && !deleteBiometrics)
            throw new AppException("Choose measurements or biometrics to delete", "حدد البيانات المراد حذفها", HttpStatus.BAD_REQUEST);
        long removed = deleteMeasurements ? measurements.deleteByMemberId(user.getId()) : 0;
        List<UUID> jobs = new ArrayList<>();
        if (deleteBiometrics) {
            for (BiometricEnrollment enrollment : enrollments.findForUpdateByMemberId(user.getId())) {
                jobs.add(requestDeviceErasure(enrollment).getId());
            }
        }
        return Map.of("measurementsDeleted", removed, "deviceErasureJobIds", jobs,
                "deviceErasurePending", !erasures.findByMemberIdAndConfirmedAtIsNull(user.getId()).isEmpty());
    }

    /** Device templates live outside this database. Keep a durable task until an operator confirms removal. */
    @Transactional
    public BiometricErasureJob requestDeviceErasure(BiometricEnrollment enrollment) {
        BiometricErasureJob job = erasures.save(BiometricErasureJob.builder()
                .gymId(enrollment.getGymId()).memberId(enrollment.getMemberId())
                .deviceSerial(enrollment.getDeviceSerial()).deviceUserId(enrollment.getDeviceUserId()).build());
        enrollments.delete(enrollment);
        return job;
    }

    @Transactional(readOnly = true)
    public List<BiometricErasureJob> pendingDeviceErasures(String email) {
        User caller = gymAdmin(email);
        return erasures.findByGymIdAndConfirmedAtIsNullOrderByRequestedAtAsc(caller.getGymId());
    }

    @Transactional
    public void confirmDeviceErasure(String email, UUID jobId, boolean confirmed) {
        User caller = gymAdmin(email);
        if (!confirmed) throw new AppException("Confirm physical device erasure first", "أكد الحذف من الجهاز أولا", HttpStatus.BAD_REQUEST);
        BiometricErasureJob job = erasures.findByIdAndGymId(jobId, caller.getGymId()).orElseThrow(this::notFound);
        job.setConfirmedAt(LocalDateTime.now());
        job.setMemberId(null);
        job.setDeviceSerial(null);
        job.setDeviceUserId(null);
        erasures.save(job);
    }

    private User member(String email) {
        User user = users.findByEmail(email).orElseThrow(this::notFound);
        if (user.getRole() != Role.MEMBER) throw forbidden();
        return user;
    }

    private User gymAdmin(String email) {
        User user = users.findByEmail(email).orElseThrow(this::notFound);
        if (user.getRole() != Role.GYM_ADMIN || user.getGymId() == null) throw forbidden();
        return user;
    }

    private AppException forbidden() { return new AppException("Access denied", "غير مصرح", HttpStatus.FORBIDDEN); }
    private AppException notFound() { return new AppException("Record not found", "السجل غير موجود", HttpStatus.NOT_FOUND); }
}
