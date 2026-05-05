package com.qawi.repository;

import com.qawi.entity.GymExerciseOverride;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GymExerciseOverrideRepository extends JpaRepository<GymExerciseOverride, UUID> {
    List<GymExerciseOverride> findByGymId(UUID gymId);
    Optional<GymExerciseOverride> findByGymIdAndExerciseTemplateId(UUID gymId, UUID exerciseTemplateId);
    void deleteByGymIdAndExerciseTemplateId(UUID gymId, UUID exerciseTemplateId);
}
