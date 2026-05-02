package com.qawi.repository;

import com.qawi.entity.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, UUID> {
    List<Attendance> findByMemberIdOrderByCheckedInAtDesc(UUID memberId);
    Optional<Attendance> findFirstByMemberIdOrderByCheckedInAtDesc(UUID memberId);
    List<Attendance> findByMemberIdAndCheckedInAtAfterOrderByCheckedInAtDesc(UUID memberId, LocalDateTime since);
}
