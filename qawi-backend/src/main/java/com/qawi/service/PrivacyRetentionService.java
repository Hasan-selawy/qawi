package com.qawi.service;

import com.qawi.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;

@Service @RequiredArgsConstructor @Slf4j
public class PrivacyRetentionService {
    private final BodyMeasurementRepository measurements;
    private final BiometricEnrollmentRepository enrollments;
    private final PrivacyService privacy;
    @Value("${qawi.privacy.retention.enabled:false}") private boolean enabled;
    @Value("${qawi.privacy.retention.dry-run:true}") private boolean dryRun;
    @Value("${qawi.privacy.measurement-retention-days:0}") private int measurementDays;
    @Value("${qawi.privacy.biometric-retention-days:0}") private int biometricDays;

    @jakarta.annotation.PostConstruct
    void validatePolicy() {
        if (enabled && measurementDays <= 0 && biometricDays <= 0)
            throw new IllegalStateException("Set an approved retention period before enabling privacy retention");
    }

    @Scheduled(cron = "${qawi.privacy.retention.cron:0 0 3 * * *}")
    @Transactional
    public void sweep() {
        if (!enabled) return;
        LocalDateTime now = LocalDateTime.now();
        var oldMeasurements = measurementDays > 0
                ? measurements.findTop500ByRecordedAtBeforeOrderByRecordedAtAsc(now.minusDays(measurementDays)) : java.util.List.<com.qawi.entity.BodyMeasurement>of();
        var oldEnrollments = biometricDays > 0
                ? enrollments.findTop500ByEnrolledAtBeforeOrderByEnrolledAtAsc(now.minusDays(biometricDays)) : java.util.List.<com.qawi.entity.BiometricEnrollment>of();
        log.info("Privacy retention dryRun={} measurements={} biometricEnrollments={} (batch limit 500 each)",
                dryRun, oldMeasurements.size(), oldEnrollments.size());
        if (dryRun) return;
        measurements.deleteAll(oldMeasurements);
        oldEnrollments.forEach(privacy::requestDeviceErasure);
    }
}
