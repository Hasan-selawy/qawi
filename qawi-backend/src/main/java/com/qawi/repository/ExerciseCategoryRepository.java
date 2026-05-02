package com.qawi.repository;

import com.qawi.entity.ExerciseCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ExerciseCategoryRepository extends JpaRepository<ExerciseCategory, UUID> {
    boolean existsByName(String name);
}
