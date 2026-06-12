package com.qawi.repository;

import com.qawi.entity.MealSuggestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface MealSuggestionRepository extends JpaRepository<MealSuggestion, UUID> {

    List<MealSuggestion> findByMemberIdOrderByCreatedAtDesc(UUID memberId);

    List<MealSuggestion> findByGymIdAndMemberIdOrderByCreatedAtDesc(UUID gymId, UUID memberId);

    List<MealSuggestion> findByPlanDayIdOrderByCreatedAtAsc(UUID planDayId);

    List<MealSuggestion> findByMemberIdAndSuggestionDateOrderByCreatedAtAsc(UUID memberId, LocalDate suggestionDate);

    @Query("SELECT s FROM MealSuggestion s WHERE s.memberId = :memberId " +
           "AND s.planDayId IS NULL AND s.suggestionDate IS NULL " +
           "ORDER BY s.createdAt DESC")
    List<MealSuggestion> findGeneralSuggestionsForMember(@Param("memberId") UUID memberId);
}
