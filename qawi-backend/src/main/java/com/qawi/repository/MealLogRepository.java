package com.qawi.repository;

import com.qawi.entity.MealLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MealLogRepository extends JpaRepository<MealLog, UUID> {
    List<MealLog> findByMemberIdAndLogDate(UUID memberId, LocalDate logDate);
    Optional<MealLog> findByMemberIdAndMealIdAndLogDate(UUID memberId, UUID mealId, LocalDate logDate);
    void deleteByMemberIdAndMealIdAndLogDate(UUID memberId, UUID mealId, LocalDate logDate);
}
