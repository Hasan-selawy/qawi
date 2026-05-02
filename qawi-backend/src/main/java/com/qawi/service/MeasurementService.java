package com.qawi.service;

import com.qawi.dto.CreateMeasurementRequest;
import com.qawi.entity.*;
import com.qawi.exception.AppException;
import com.qawi.repository.BodyMeasurementRepository;
import com.qawi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MeasurementService {

    private final BodyMeasurementRepository measurementRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional
    public BodyMeasurement addMeasurement(CreateMeasurementRequest req, String recorderEmail) {
        User recorder = userRepository.findByEmail(recorderEmail)
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));

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

    public List<BodyMeasurement> getByMember(UUID memberId) {
        return measurementRepository.findByMemberIdOrderByRecordedAtDesc(memberId);
    }

    public Optional<BodyMeasurement> getLatest(UUID memberId) {
        return measurementRepository.findFirstByMemberIdOrderByRecordedAtDesc(memberId);
    }
}
