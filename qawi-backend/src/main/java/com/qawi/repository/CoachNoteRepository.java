package com.qawi.repository;

import com.qawi.entity.CoachNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CoachNoteRepository extends JpaRepository<CoachNote, UUID> {
    List<CoachNote> findByMemberIdOrderByCreatedAtDesc(UUID memberId);
}
