package com.qawi.repository;

import com.qawi.entity.NutritionPlanDay;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NutritionPlanDayRepository extends JpaRepository<NutritionPlanDay, UUID> {

    List<NutritionPlanDay> findByPlanIdOrderByDayDate(UUID planId);

    Optional<NutritionPlanDay> findByPlanIdAndDayDate(UUID planId, LocalDate dayDate);

    Optional<NutritionPlanDay> findByMemberIdAndDayDate(UUID memberId, LocalDate dayDate);

    @Query("SELECT d FROM NutritionPlanDay d WHERE d.planId IN " +
           "(SELECT p.id FROM NutritionCalendarPlan p WHERE p.memberId = :memberId AND p.isActive = true) " +
           "AND d.dayDate = :date")
    Optional<NutritionPlanDay> findActiveplanDayForMemberAndDate(
            @Param("memberId") UUID memberId, @Param("date") LocalDate date);
}
