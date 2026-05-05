package com.qawi.repository;

import com.qawi.entity.ClassBooking;
import com.qawi.entity.ClassBookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ClassBookingRepository extends JpaRepository<ClassBooking, UUID> {
    List<ClassBooking> findByClassId(UUID classId);
    List<ClassBooking> findByClassIdAndStatus(UUID classId, ClassBookingStatus status);
    List<ClassBooking> findByMemberId(UUID memberId);
    List<ClassBooking> findByMemberIdAndStatus(UUID memberId, ClassBookingStatus status);
    Optional<ClassBooking> findByClassIdAndMemberId(UUID classId, UUID memberId);
    long countByClassIdAndStatus(UUID classId, ClassBookingStatus status);
}
