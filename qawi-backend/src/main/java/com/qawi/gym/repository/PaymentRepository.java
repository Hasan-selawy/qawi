package com.qawi.gym.repository;

import com.qawi.gym.entity.Payment;
import com.qawi.gym.entity.enums.PaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Page<Payment> findByMemberId(Long memberId, Pageable pageable);
    Page<Payment> findBySubscriptionId(Long subscriptionId, Pageable pageable);

    @Query("SELECT p FROM Payment p WHERE p.member.gym.id = :gymId ORDER BY p.paymentDate DESC")
    Page<Payment> findByGymId(@Param("gymId") Long gymId, Pageable pageable);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.member.gym.id = :gymId " +
           "AND p.status = 'COMPLETED' AND p.paymentDate BETWEEN :from AND :to")
    BigDecimal sumRevenueByGymIdAndDateRange(@Param("gymId") Long gymId,
                                             @Param("from") LocalDateTime from,
                                             @Param("to") LocalDateTime to);

    long countByMemberGymIdAndStatus(Long gymId, PaymentStatus status);
}
