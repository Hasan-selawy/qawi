package com.qawi.repository;

import com.qawi.entity.RenewalRequest;
import com.qawi.entity.RenewalRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RenewalRequestRepository extends JpaRepository<RenewalRequest, UUID> {
    Optional<RenewalRequest> findByIdAndGymId(UUID id, UUID gymId);
    List<RenewalRequest> findByGymIdOrderByCreatedAtDesc(UUID gymId);
    List<RenewalRequest> findByGymIdAndStatusOrderByCreatedAtDesc(UUID gymId, RenewalRequestStatus status);
    List<RenewalRequest> findByMemberIdOrderByCreatedAtDesc(UUID memberId);
}
