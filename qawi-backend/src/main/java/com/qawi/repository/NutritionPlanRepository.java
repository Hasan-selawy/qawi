package com.qawi.repository;

import com.qawi.entity.NutritionPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface NutritionPlanRepository extends JpaRepository<NutritionPlan, UUID> {
    List<NutritionPlan> findByMemberId(UUID memberId);
}
