package com.qawi.repository;

import com.qawi.entity.NutritionCalendarPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NutritionCalendarPlanRepository extends JpaRepository<NutritionCalendarPlan, UUID> {

    List<NutritionCalendarPlan> findByMemberIdOrderByCreatedAtDesc(UUID memberId);

    Optional<NutritionCalendarPlan> findByMemberIdAndIsActiveTrue(UUID memberId);

    @Query("SELECT p FROM NutritionCalendarPlan p WHERE p.memberId = :memberId " +
           "AND p.isActive = true AND p.startDate <= :date AND p.endDate >= :date")
    Optional<NutritionCalendarPlan> findActivePlanForDate(
            @Param("memberId") UUID memberId, @Param("date") LocalDate date);

    List<NutritionCalendarPlan> findByMemberIdAndIsActiveTrueAndStartDateLessThanEqual(
            UUID memberId, LocalDate date);
}
