package com.qawi.repository;

import com.qawi.entity.WorkoutTemplateDay;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface WorkoutTemplateDayRepository extends JpaRepository<WorkoutTemplateDay, UUID> {
    List<WorkoutTemplateDay> findByTemplateIdOrderByDayNumber(UUID templateId);
    void deleteByTemplateId(UUID templateId);
}
