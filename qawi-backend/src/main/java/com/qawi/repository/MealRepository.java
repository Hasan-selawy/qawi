package com.qawi.repository;

import com.qawi.entity.Meal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MealRepository extends JpaRepository<Meal, UUID> {
    List<Meal> findByNutritionPlanIdOrderByOrderIndex(UUID nutritionPlanId);
    long countByNutritionPlanId(UUID nutritionPlanId);
    void deleteByNutritionPlanId(UUID nutritionPlanId);
}
