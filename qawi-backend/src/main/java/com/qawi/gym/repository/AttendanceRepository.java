package com.qawi.gym.repository;

import com.qawi.gym.entity.Attendance;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, Long> {
    Page<Attendance> findByMemberId(Long memberId, Pageable pageable);
    Page<Attendance> findByGymId(Long gymId, Pageable pageable);

    @Query("SELECT a FROM Attendance a WHERE a.member.id = :memberId AND a.checkOutTime IS NULL")
    Optional<Attendance> findOpenSession(@Param("memberId") Long memberId);

    @Query("SELECT COUNT(a) FROM Attendance a WHERE a.gym.id = :gymId " +
           "AND a.checkInTime BETWEEN :from AND :to")
    long countByGymIdAndDateRange(@Param("gymId") Long gymId,
                                  @Param("from") LocalDateTime from,
                                  @Param("to") LocalDateTime to);

    @Query("SELECT COUNT(DISTINCT a.member.id) FROM Attendance a WHERE a.gym.id = :gymId " +
           "AND a.checkInTime BETWEEN :from AND :to")
    long countUniqueVisitorsByGymIdAndDateRange(@Param("gymId") Long gymId,
                                                @Param("from") LocalDateTime from,
                                                @Param("to") LocalDateTime to);
}
