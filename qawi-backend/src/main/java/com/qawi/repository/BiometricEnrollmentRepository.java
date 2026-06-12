package com.qawi.repository;

import com.qawi.entity.BiometricEnrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BiometricEnrollmentRepository extends JpaRepository<BiometricEnrollment, UUID> {
    List<BiometricEnrollment> findByGymIdOrderByEnrolledAtDesc(UUID gymId);
    Optional<BiometricEnrollment> findByDeviceSerialAndDeviceUserId(String deviceSerial, String deviceUserId);
    Optional<BiometricEnrollment> findByMemberIdAndDeviceSerial(UUID memberId, String deviceSerial);
}
