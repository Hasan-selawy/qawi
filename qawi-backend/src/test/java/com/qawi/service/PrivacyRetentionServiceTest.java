package com.qawi.service;

import com.qawi.entity.*;
import com.qawi.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.List;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PrivacyRetentionServiceTest {
    @Test
    void retentionNeedsPolicyAndDryRunNeverDeletesOrQueuesDeviceErasure() {
        var measurements = mock(BodyMeasurementRepository.class);
        var enrollments = mock(BiometricEnrollmentRepository.class);
        var privacy = mock(PrivacyService.class);
        var retention = new PrivacyRetentionService(measurements, enrollments, privacy);
        retention.sweep();
        verifyNoInteractions(measurements, enrollments, privacy);
        ReflectionTestUtils.setField(retention, "enabled", true);
        assertThrows(IllegalStateException.class, retention::validatePolicy);
        ReflectionTestUtils.setField(retention, "measurementDays", 30);
        ReflectionTestUtils.setField(retention, "biometricDays", 90);
        ReflectionTestUtils.setField(retention, "dryRun", true);
        var measurement = BodyMeasurement.builder().build();
        var enrollment = BiometricEnrollment.builder().build();
        when(measurements.findTop500ByRecordedAtBeforeOrderByRecordedAtAsc(any())).thenReturn(List.of(measurement));
        when(enrollments.findTop500ByEnrolledAtBeforeOrderByEnrolledAtAsc(any())).thenReturn(List.of(enrollment));
        retention.sweep();
        verify(measurements, never()).deleteAll(any(Iterable.class));
        verifyNoInteractions(privacy);
        ReflectionTestUtils.setField(retention, "dryRun", false);
        retention.sweep();
        verify(measurements).deleteAll(List.of(measurement));
        verify(privacy).requestDeviceErasure(enrollment);
    }
}
