package com.qawi.gym.repository;

import com.qawi.gym.entity.Subscription;
import com.qawi.gym.entity.enums.SubscriptionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {
    Page<Subscription> findByMemberId(Long memberId, Pageable pageable);
    Optional<Subscription> findByMemberIdAndStatus(Long memberId, SubscriptionStatus status);

    @Query("SELECT s FROM Subscription s WHERE s.member.gym.id = :gymId AND s.status = :status")
    Page<Subscription> findByGymIdAndStatus(@Param("gymId") Long gymId,
                                            @Param("status") SubscriptionStatus status,
                                            Pageable pageable);

    @Query("SELECT s FROM Subscription s WHERE s.endDate BETWEEN :from AND :to AND s.status = 'ACTIVE'")
    List<Subscription> findExpiringBetween(@Param("from") LocalDate from, @Param("to") LocalDate to);

    long countByMemberGymIdAndStatus(Long gymId, SubscriptionStatus status);
}
