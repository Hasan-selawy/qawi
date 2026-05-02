package com.qawi.repository;

import com.qawi.entity.WorkoutTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface WorkoutTemplateRepository extends JpaRepository<WorkoutTemplate, UUID> {
    List<WorkoutTemplate> findByCoachId(UUID coachId);
}
