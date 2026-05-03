package com.qawi.service;

import com.qawi.dto.CreateMeasurementRequest;
import com.qawi.entity.*;
import com.qawi.repository.BodyMeasurementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MeasurementService {

    private final BodyMeasurementRepository measurementRepository;
    private final NotificationService notificationService;
    private final AccessGuard accessGuard;

    @Transactional
    public BodyMeasurement addMeasurement(CreateMeasurementRequest req, String recorderEmail) {
        User recorder = accessGuard.loadUserByEmail(recorderEmail);
        // Coach must be assigned; admin must be in same gym.
        if (recorder.getRole() == Role.COACH) {
            accessGuard.assertCoachManagesMember(recorderEmail, req.getMemberId());
        } else {
            accessGuard.assertCanAccessMember(recorderEmail, req.getMemberId());
        }

        BodyMeasurement measurement = measurementRepository.save(BodyMeasurement.builder()
                .memberId(req.getMemberId())
                .recordedBy(recorder.getId())
                .weight(req.getWeight())
                .height(req.getHeight())
                .chest(req.getChest())
                .waist(req.getWaist())
                .hips(req.getHips())
                .arms(req.getArms())
                .legs(req.getLegs())
                .bodyFatPercentage(req.getBodyFatPercentage())
                .notes(req.getNotes())
                .build());

        notificationService.create(
                req.getMemberId(),
                NotificationType.MEASUREMENT_ADDED,
                "New measurements recorded 📊",
                "تم تسجيل قياساتك الجديدة 📊"
        );

        return measurement;
    }

    @Transactional(readOnly = true)
    public List<BodyMeasurement> getByMember(UUID memberId, String callerEmail) {
        accessGuard.assertCanAccessMember(callerEmail, memberId);
        return measurementRepository.findByMemberIdOrderByRecordedAtDesc(memberId);
    }

    @Transactional(readOnly = true)
    public Optional<BodyMeasurement> getLatest(UUID memberId, String callerEmail) {
        accessGuard.assertCanAccessMember(callerEmail, memberId);
        return measurementRepository.findFirstByMemberIdOrderByRecordedAtDesc(memberId);
    }
}
