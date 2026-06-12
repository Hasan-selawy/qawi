package com.qawi.repository;

import com.qawi.entity.MealSuggestion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MealSuggestionRepository extends JpaRepository<MealSuggestion, UUID> {
    List<MealSuggestion> findByMemberIdOrderByCreatedAtDesc(UUID memberId);
    List<MealSuggestion> findByGymIdAndMemberIdOrderByCreatedAtDesc(UUID gymId, UUID memberId);
}
