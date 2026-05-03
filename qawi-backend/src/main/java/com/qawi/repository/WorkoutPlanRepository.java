package com.qawi.repository;

import com.qawi.entity.WorkoutPlan;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorkoutPlanRepository extends JpaRepository<WorkoutPlan, UUID> {
    List<WorkoutPlan> findByMemberId(UUID memberId);

    /**
     * Pessimistic SELECT … FOR UPDATE — used by the auto-shift logic to
     * serialize concurrent shifts of the same plan.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM WorkoutPlan p WHERE p.id = :id")
    Optional<WorkoutPlan> findByIdForUpdate(@Param("id") UUID id);
}
