package com.qawi.repository;

import com.qawi.entity.NutritionTarget;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface NutritionTargetRepository extends JpaRepository<NutritionTarget, UUID> {
    Optional<NutritionTarget> findByMemberId(UUID memberId);
    boolean existsByMemberId(UUID memberId);
    void deleteByMemberId(UUID memberId);
}
