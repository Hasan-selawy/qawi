package com.qawi.repository;

import com.qawi.entity.BiometricDevice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BiometricDeviceRepository extends JpaRepository<BiometricDevice, UUID> {
    List<BiometricDevice> findByGymIdOrderByRegisteredAtDesc(UUID gymId);
    Optional<BiometricDevice> findByDeviceSerial(String deviceSerial);
    Optional<BiometricDevice> findByDeviceSerialAndGymId(String deviceSerial, UUID gymId);
}
