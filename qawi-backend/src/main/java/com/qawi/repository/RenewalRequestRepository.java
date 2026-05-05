package com.qawi.repository;

import com.qawi.entity.RenewalRequest;
import com.qawi.entity.RenewalRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RenewalRequestRepository extends JpaRepository<RenewalRequest, UUID> {
    List<RenewalRequest> findByGymIdOrderByCreatedAtDesc(UUID gymId);
    List<RenewalRequest> findByGymIdAndStatusOrderByCreatedAtDesc(UUID gymId, RenewalRequestStatus status);
    List<RenewalRequest> findByMemberIdOrderByCreatedAtDesc(UUID memberId);
}
