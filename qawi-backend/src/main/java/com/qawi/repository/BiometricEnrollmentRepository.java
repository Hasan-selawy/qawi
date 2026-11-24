package com.qawi.repository;

import com.qawi.entity.BiometricEnrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BiometricEnrollmentRepository extends JpaRepository<BiometricEnrollment, UUID> {
    List<BiometricEnrollment> findByMemberId(UUID memberId);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select e from BiometricEnrollment e where e.memberId = :memberId")
    List<BiometricEnrollment> findForUpdateByMemberId(UUID memberId);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    List<BiometricEnrollment> findTop500ByEnrolledAtBeforeOrderByEnrolledAtAsc(java.time.LocalDateTime cutoff);
    List<BiometricEnrollment> findByGymIdOrderByEnrolledAtDesc(UUID gymId);
    Optional<BiometricEnrollment> findByDeviceSerialAndDeviceUserId(String deviceSerial, String deviceUserId);
    Optional<BiometricEnrollment> findByMemberIdAndDeviceSerial(UUID memberId, String deviceSerial);
}
