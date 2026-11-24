package com.qawi.repository;

import com.qawi.entity.BodyMeasurement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BodyMeasurementRepository extends JpaRepository<BodyMeasurement, UUID> {
    long deleteByMemberId(UUID memberId);
    List<BodyMeasurement> findTop500ByRecordedAtBeforeOrderByRecordedAtAsc(java.time.LocalDateTime cutoff);
    List<BodyMeasurement> findByMemberIdOrderByRecordedAtDesc(UUID memberId);
    Optional<BodyMeasurement> findFirstByMemberIdOrderByRecordedAtDesc(UUID memberId);
}
