package com.qawi.repository;

import com.qawi.entity.ExerciseTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ExerciseTemplateRepository extends JpaRepository<ExerciseTemplate, UUID> {
    List<ExerciseTemplate> findByCategoryId(UUID categoryId);

    List<ExerciseTemplate> findByIsCustomFalse();

    List<ExerciseTemplate> findByIsCustomFalseOrCreatedByCoachId(UUID createdByCoachId);

    List<ExerciseTemplate> findByCategoryIdAndIsCustomFalse(UUID categoryId);

    List<ExerciseTemplate> findByCategoryIdAndIsCustomFalseOrCategoryIdAndCreatedByCoachId(
            UUID categoryIdForDefaults, UUID categoryIdForCustom, UUID createdByCoachId);

    /** Coach view: GLOBAL + own gym's GYM-scope + own COACH-scope. */
    @Query("""
        SELECT e FROM ExerciseTemplate e
        WHERE e.scope = com.qawi.entity.ExerciseScope.GLOBAL
           OR (e.scope = com.qawi.entity.ExerciseScope.GYM   AND e.gymId = :gymId)
           OR (e.scope = com.qawi.entity.ExerciseScope.COACH AND e.createdByCoachId = :coachId)
        """)
    List<ExerciseTemplate> findVisibleForCoach(@Param("gymId") UUID gymId, @Param("coachId") UUID coachId);

    /** Gym admin view: GLOBAL + every GYM/COACH row tagged with their gym. */
    @Query("""
        SELECT e FROM ExerciseTemplate e
        WHERE e.scope = com.qawi.entity.ExerciseScope.GLOBAL
           OR e.gymId = :gymId
        """)
    List<ExerciseTemplate> findVisibleForGymAdmin(@Param("gymId") UUID gymId);
}
