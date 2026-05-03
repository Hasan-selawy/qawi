package com.qawi.repository;

import com.qawi.entity.WorkoutLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorkoutLogRepository extends JpaRepository<WorkoutLog, UUID> {
    List<WorkoutLog> findByMemberIdOrderByLoggedAtDesc(UUID memberId);
    long countByMemberIdAndLoggedAtAfter(UUID memberId, LocalDateTime since);

    Optional<WorkoutLog> findFirstByPlanExerciseIdOrderByLoggedAtDesc(UUID planExerciseId);

    @org.springframework.data.jpa.repository.Modifying
    void deleteByPlanExerciseIdIn(List<UUID> planExerciseIds);

    List<WorkoutLog> findByPlanExerciseIdInOrderByLoggedAtDesc(List<UUID> planExerciseIds);

    @Query("SELECT w.memberId, COUNT(w) as cnt FROM WorkoutLog w WHERE w.loggedAt >= :since GROUP BY w.memberId ORDER BY cnt DESC")
    List<Object[]> findTopMembersByLogsSince(LocalDateTime since);
}
