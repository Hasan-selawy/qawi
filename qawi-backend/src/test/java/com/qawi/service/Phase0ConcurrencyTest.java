package com.qawi.service;

import com.qawi.controller.MemberClassController;
import com.qawi.controller.GymClassController;
import com.qawi.entity.*;
import com.qawi.exception.AppException;
import com.qawi.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.IntConsumer;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@EnabledIfEnvironmentVariable(named = "PHASE0_DB_URL", matches = ".+")
@DataJpaTest(properties = {
        "spring.datasource.url=${PHASE0_DB_URL}",
        "spring.datasource.username=${PHASE0_DB_USER}",
        "spring.datasource.password=${PHASE0_DB_PASSWORD:}",
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.flyway.enabled=true",
        "spring.jpa.show-sql=false"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@Import({MemberClassController.class, GymClassController.class, AttendanceService.class, ReceptionService.class, AttendanceOperationService.class, AttendanceOperationCleanupService.class, Phase0ConcurrencyTest.JsonConfig.class})
class Phase0ConcurrencyTest {
    @org.springframework.boot.test.context.TestConfiguration
    static class JsonConfig {
        @org.springframework.context.annotation.Bean
        com.fasterxml.jackson.databind.ObjectMapper objectMapper() {
            return new com.fasterxml.jackson.databind.ObjectMapper().findAndRegisterModules()
                    .disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        }
    }
    @Autowired AttendanceOperationService operations;
    @Autowired AttendanceOperationCleanupService operationCleanup;
    @Autowired AttendanceOperationRepository operationRepository;
    @Autowired MemberClassController classes;
    @Autowired GymClassController adminClasses;
    @Autowired AttendanceService attendance;
    @Autowired ReceptionService reception;
    @Autowired UserRepository users;
    @Autowired GymClassRepository gymClasses;
    @Autowired ClassBookingRepository bookings;
    @Autowired AttendanceRepository attendances;
    @Autowired GymRepository gyms;
    @MockBean GymFeatureService features;
    @MockBean GymAdminService admins;
    @MockBean NotificationService notifications;
    @MockBean AccessGuard access;
    @MockBean org.springframework.security.crypto.password.PasswordEncoder passwords;

    @Test
    void simultaneousBookingsCannotOverbookLastSpot() throws Exception {
        UUID gym = gym();
        when(features.isEnabledForGymId(any(), any())).thenReturn(true);
        GymClass gymClass = gymClasses.save(GymClass.builder().gymId(gym).name("Last spot")
                .instructorName("Coach").dateTime(LocalDateTime.now().plusDays(1))
                .durationMinutes(60).maxCapacity(1).build());
        List<User> members = new ArrayList<>();
        for (int i = 0; i < 8; i++) members.add(user(gym, Role.MEMBER));
        race(8, i -> {
            try {
                classes.bookClass(gymClass.getId(), members.get(i));
            } catch (AppException error) {
                assertEquals(409, error.getStatus().value());
            }
        });
        assertEquals(1, bookings.countByClassIdAndStatus(gymClass.getId(), ClassBookingStatus.BOOKED));
        assertEquals(404, assertThrows(AppException.class,
                () -> classes.bookClass(gymClass.getId(), user(UUID.randomUUID(), Role.MEMBER))).getStatus().value());
        User admin = user(gym, Role.GYM_ADMIN);
        when(admins.getGymIdForAdmin(admin.getEmail())).thenReturn(gym);
        assertEquals(409, assertThrows(AppException.class,
                () -> adminClasses.updateClass(gymClass.getId(), Map.of("maxCapacity", 0), admin)).getStatus().value());
        ClassBooking winner = bookings.findByClassId(gymClass.getId()).get(0);
        User bookedMember = users.findById(winner.getMemberId()).orElseThrow();
        classes.cancelBooking(gymClass.getId(), bookedMember);
        classes.bookClass(gymClass.getId(), bookedMember);
        assertEquals(1, bookings.countByClassIdAndStatus(gymClass.getId(), ClassBookingStatus.BOOKED));
    }

    @Test
    void selfServiceAndReceptionRetriesCreateOneDailyCheckIn() throws Exception {
        UUID gym = gym();
        User member = user(gym, Role.MEMBER);
        User staff = user(gym, Role.RECEPTIONIST);
        race(8, i -> {
            if (i % 2 == 0) attendance.checkIn(member.getEmail());
            else reception.checkIn(staff.getEmail(), member.getId());
        });
        assertEquals(1, attendances.findByMemberIdOrderByCheckedInAtDesc(member.getId()).size());
        var first = attendance.checkIn(member.getEmail()).getAttendance();
        var repeat = attendance.checkIn(member.getEmail()).getAttendance();
        assertEquals(first.getId(), repeat.getId());
        attendance.checkOut(member.getEmail());
        assertNotNull(attendance.checkIn(member.getEmail()).getAttendance().getCheckedOutAt());
        var duplicate = Attendance.builder().gymId(gym).memberId(member.getId()).build();
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,
                () -> attendances.saveAndFlush(duplicate));
        attendances.saveAndFlush(Attendance.builder().gymId(gym).memberId(member.getId())
                .checkedInAt(LocalDateTime.now().minusDays(1)).build());
        assertEquals(2, attendances.findByMemberIdOrderByCheckedInAtDesc(member.getId()).size());
    }

    @Test
    void concurrentOfflineRetriesKeepOneOperationAndOriginalDayAndRejectKeyReuse() throws Exception {
        User member = user(gym(), Role.MEMBER);
        var instant = java.time.Instant.now().minusSeconds(86400);
        var request = new com.qawi.dto.AttendanceOperationRequest(UUID.randomUUID(),
                com.qawi.dto.AttendanceOperationRequest.Operation.CHECKIN, instant);
        race(8, index -> operations.apply(member.getEmail(), request));
        assertEquals(1, attendances.findByMemberIdOrderByCheckedInAtDesc(member.getId()).size());
        assertTrue(operationRepository.findByMemberIdAndIdempotencyKey(member.getId(), request.idempotencyKey()).isPresent());
        var replay = operations.apply(member.getEmail(), request);
        assertEquals(java.time.LocalDateTime.ofInstant(instant, java.time.ZoneId.systemDefault()), replay.attendance().getCheckedInAt());
        var conflicting = new com.qawi.dto.AttendanceOperationRequest(request.idempotencyKey(),
                com.qawi.dto.AttendanceOperationRequest.Operation.CHECKOUT, instant);
        assertEquals(409, assertThrows(AppException.class, () -> operations.apply(member.getEmail(), conflicting)).getStatus().value());
        var tooOld = new com.qawi.dto.AttendanceOperationRequest(UUID.randomUUID(),
                com.qawi.dto.AttendanceOperationRequest.Operation.CHECKIN, instant.minusSeconds(86400 * 8));
        assertEquals(400, assertThrows(AppException.class, () -> operations.apply(member.getEmail(), tooOld)).getStatus().value());
        var oldKey = UUID.randomUUID();
        operationRepository.save(AttendanceOperation.builder().memberId(member.getId()).idempotencyKey(oldKey)
                .requestHash("0".repeat(64)).responseJson("{}").createdAt(LocalDateTime.now().minusDays(10)).build());
        operationCleanup.sweep();
        assertTrue(operationRepository.findByMemberIdAndIdempotencyKey(member.getId(), oldKey).isEmpty());
        assertTrue(operationRepository.findByMemberIdAndIdempotencyKey(member.getId(), request.idempotencyKey()).isPresent());
        User other = user(member.getGymId(), Role.MEMBER);
        operations.apply(other.getEmail(), request);
        assertEquals(1, attendances.findByMemberIdOrderByCheckedInAtDesc(other.getId()).size());
    }

    private User user(UUID gym, Role role) {
        if (!gyms.existsById(gym)) gym = gym();
        return users.save(User.builder().name("Race test").email(UUID.randomUUID() + "@test.com")
                .password("unused").gymId(gym).role(role).build());
    }

    private UUID gym() {
        return gyms.save(Gym.builder().name("Phase 0 test")
                .subscriptionPlan(SubscriptionPlan.PRO).build()).getId();
    }

    private void race(int count, IntConsumer operation) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(count);
        CountDownLatch ready = new CountDownLatch(count);
        CountDownLatch start = new CountDownLatch(1);
        try {
            List<Future<?>> futures = new ArrayList<>();
            for (int i = 0; i < count; i++) {
                int index = i;
                futures.add(pool.submit(() -> {
                    ready.countDown();
                    try {
                        if (!start.await(15, TimeUnit.SECONDS)) throw new AssertionError("Race did not start");
                        operation.accept(index);
                    } catch (InterruptedException error) {
                        Thread.currentThread().interrupt();
                        throw new AssertionError(error);
                    }
                }));
            }
            assertTrue(ready.await(15, TimeUnit.SECONDS));
            start.countDown();
            for (Future<?> future : futures) future.get(30, TimeUnit.SECONDS);
        } finally {
            pool.shutdownNow();
        }
    }
}
