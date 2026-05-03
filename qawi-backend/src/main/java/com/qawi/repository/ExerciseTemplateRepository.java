package com.qawi.repository;

import com.qawi.entity.ExerciseTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
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
}
