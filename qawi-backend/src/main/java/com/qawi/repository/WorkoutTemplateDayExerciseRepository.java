package com.qawi.repository;

import com.qawi.entity.WorkoutTemplateDayExercise;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface WorkoutTemplateDayExerciseRepository extends JpaRepository<WorkoutTemplateDayExercise, UUID> {
    List<WorkoutTemplateDayExercise> findByTemplateDayIdOrderByOrderIndex(UUID templateDayId);
    void deleteByTemplateDayId(UUID templateDayId);
    boolean existsByExerciseTemplateId(UUID exerciseTemplateId);

    @org.springframework.data.jpa.repository.Modifying
    void deleteByExerciseTemplateId(UUID exerciseTemplateId);
}
