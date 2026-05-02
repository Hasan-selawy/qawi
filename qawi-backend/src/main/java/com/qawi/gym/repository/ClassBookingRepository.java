package com.qawi.gym.repository;

import com.qawi.gym.entity.ClassBooking;
import com.qawi.gym.entity.enums.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClassBookingRepository extends JpaRepository<ClassBooking, Long> {
    List<ClassBooking> findByGymClassId(Long classId);
    List<ClassBooking> findByMemberId(Long memberId);
    Optional<ClassBooking> findByMemberIdAndGymClassId(Long memberId, Long classId);
    boolean existsByMemberIdAndGymClassId(Long memberId, Long classId);

    @Query("SELECT COUNT(b) FROM ClassBooking b WHERE b.gymClass.id = :classId AND b.status = :status")
    long countByClassIdAndStatus(@Param("classId") Long classId, @Param("status") BookingStatus status);
}
