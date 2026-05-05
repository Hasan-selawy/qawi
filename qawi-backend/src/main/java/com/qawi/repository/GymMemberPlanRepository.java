package com.qawi.repository;

import com.qawi.entity.GymMemberPlan;
import com.qawi.entity.MemberPlanDuration;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface GymMemberPlanRepository extends JpaRepository<GymMemberPlan, UUID> {
    List<GymMemberPlan> findByGymIdOrderByDurationAscCreatedAtAsc(UUID gymId);
    List<GymMemberPlan> findByGymIdAndActiveTrueOrderByDurationAscCreatedAtAsc(UUID gymId);
    long countByGymId(UUID gymId);
}
