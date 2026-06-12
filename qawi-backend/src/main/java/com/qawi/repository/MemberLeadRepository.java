package com.qawi.repository;

import com.qawi.entity.MemberLead;
import com.qawi.entity.MemberLeadStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MemberLeadRepository extends JpaRepository<MemberLead, UUID> {

    List<MemberLead> findByGymIdOrderByCreatedAtDesc(UUID gymId);

    List<MemberLead> findByGymIdAndStatusOrderByCreatedAtDesc(UUID gymId, MemberLeadStatus status);
}
