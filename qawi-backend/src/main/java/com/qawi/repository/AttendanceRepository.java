package com.qawi.repository;

import com.qawi.entity.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
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

    List<Attendance> findByGymIdAndCheckedInAtAfter(UUID gymId, LocalDateTime since);

    @Query("SELECT DISTINCT a.memberId FROM Attendance a WHERE a.gymId = :gymId AND a.checkedInAt >= :since")
    List<UUID> findDistinctMemberIdsByGymIdAndCheckedInAtAfter(UUID gymId, LocalDateTime since);

    @Query("SELECT a FROM Attendance a WHERE a.gymId = :gymId AND a.checkedInAt >= :since ORDER BY a.checkedInAt ASC")
    List<Attendance> findByGymIdAndCheckedInAtAfterOrdered(UUID gymId, LocalDateTime since);
}
