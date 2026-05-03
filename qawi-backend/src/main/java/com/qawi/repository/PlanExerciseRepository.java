package com.qawi.repository;

import com.qawi.entity.PlanExercise;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PlanExerciseRepository extends JpaRepository<PlanExercise, UUID> {
    List<PlanExercise> findByScheduleDayIdOrderByOrderIndex(UUID scheduleDayId);
    void deleteByScheduleDayId(UUID scheduleDayId);
    boolean existsByExerciseTemplateId(UUID exerciseTemplateId);
    List<PlanExercise> findByExerciseTemplateId(UUID exerciseTemplateId);

    @Modifying
    void deleteByExerciseTemplateId(UUID exerciseTemplateId);

    /**
     * Single-query usage join with DB-level visibility filter — avoids N+1
     * and prevents cross-tenant data exposure (the filter is enforced in SQL,
     * never in application code).
     *
     * Returns rows of [PlanExercise, ScheduleDay, WorkoutPlan, memberName].
     */
    @Query("""
            SELECT pe, sd, wp, u.name
            FROM PlanExercise pe,
                 com.qawi.entity.ScheduleDay sd,
                 com.qawi.entity.WorkoutPlan wp,
                 com.qawi.entity.User u
            WHERE pe.exerciseTemplateId = :exerciseId
              AND sd.id = pe.scheduleDayId
              AND wp.id = sd.workoutPlanId
              AND u.id = wp.memberId
              AND (
                   :role = 'SUPER_ADMIN'
                OR (:role = 'COACH'     AND wp.coachId = :scopeId)
                OR (:role = 'GYM_ADMIN' AND u.gymId   = :scopeId)
              )
            """)
    List<Object[]> findUsageRows(
            @Param("exerciseId") UUID exerciseId,
            @Param("role") String role,
            @Param("scopeId") UUID scopeId);
}
