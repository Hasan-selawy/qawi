package com.qawi.repository;

import com.qawi.entity.MemberSuggestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MemberSuggestionRepository extends JpaRepository<MemberSuggestion, UUID> {
    List<MemberSuggestion> findByGymIdOrderByCreatedAtDesc(UUID gymId);
}
