package com.qawi.service;

import com.qawi.entity.*;
import com.qawi.repository.*;
import com.qawi.exception.AppException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest(properties = {"spring.flyway.enabled=false", "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect"})
@Import(PrivacyService.class)
class PrivacyServiceTest {
    @Autowired PrivacyService privacy;
    @Autowired UserRepository users;
    @Autowired BodyMeasurementRepository measurements;
    @Autowired BiometricEnrollmentRepository enrollments;
    @Autowired BiometricErasureJobRepository jobs;

    @Test
    void exportAndErasureStayScopedAndPhysicalDeletionRemainsPendingUntilConfirmed() {
        UUID gym = UUID.randomUUID();
        User member = user(gym, Role.MEMBER);
        User other = user(UUID.randomUUID(), Role.MEMBER);
        User admin = user(gym, Role.GYM_ADMIN);
        User foreignAdmin = user(other.getGymId(), Role.GYM_ADMIN);
        for (User person : List.of(member, other)) {
            measurements.save(BodyMeasurement.builder().memberId(person.getId()).recordedBy(person.getId()).weight(75.0).build());
            enrollments.save(BiometricEnrollment.builder().memberId(person.getId()).gymId(person.getGymId())
                    .deviceSerial(person.getGymId().toString()).deviceUserId("42").build());
        }
        assertEquals(1, ((List<?>) privacy.exportSelf(member.getEmail()).get("measurements")).size());
        assertThrows(AppException.class, () -> privacy.exportSelf(admin.getEmail()));
        var receipt = privacy.deleteSelf(member.getEmail(), true, true);
        assertEquals(1L, receipt.get("measurementsDeleted"));
        assertTrue((Boolean) receipt.get("deviceErasurePending"));
        assertEquals(0, measurements.findByMemberIdOrderByRecordedAtDesc(member.getId()).size());
        assertEquals(1, measurements.findByMemberIdOrderByRecordedAtDesc(other.getId()).size());
        assertEquals(1, enrollments.findByMemberId(other.getId()).size());
        var job = jobs.findByMemberIdAndConfirmedAtIsNull(member.getId()).get(0);
        assertEquals(404, assertThrows(AppException.class,
                () -> privacy.confirmDeviceErasure(foreignAdmin.getEmail(), job.getId(), true)).getStatus().value());
        privacy.confirmDeviceErasure(admin.getEmail(), job.getId(), true);
        assertNull(job.getMemberId());
        assertNull(job.getDeviceSerial());
        assertNull(job.getDeviceUserId());
        assertNotNull(job.getConfirmedAt());
        assertFalse((Boolean) privacy.deleteSelf(member.getEmail(), true, true).get("deviceErasurePending"));
    }

    private User user(UUID gym, Role role) {
        return users.save(User.builder().name("Privacy test").email(UUID.randomUUID() + "@test.com")
                .password("unused").role(role).gymId(gym).build());
    }
}
