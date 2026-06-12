package com.qawi.repository;

import com.qawi.entity.MemberLead;
import com.qawi.entity.MemberLeadStatus;
import com.qawi.entity.MemberLeadType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MemberLeadRepository extends JpaRepository<MemberLead, UUID> {

    List<MemberLead> findByGymIdOrderByCreatedAtDesc(UUID gymId);

    List<MemberLead> findByGymIdAndStatusOrderByCreatedAtDesc(UUID gymId, MemberLeadStatus status);

    List<MemberLead> findByGymIdAndTypeOrderByCreatedAtDesc(UUID gymId, MemberLeadType type);

    Optional<MemberLead> findByMemberIdAndGymId(UUID memberId, UUID gymId);

    boolean existsByMemberIdAndGymId(UUID memberId, UUID gymId);
}
