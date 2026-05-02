package com.qawi.repository;

import com.qawi.entity.CoachMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface CoachMemberRepository extends JpaRepository<CoachMember, UUID> {
}
