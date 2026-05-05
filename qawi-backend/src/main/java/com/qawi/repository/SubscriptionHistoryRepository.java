package com.qawi.repository;

import com.qawi.entity.SubscriptionHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface SubscriptionHistoryRepository extends JpaRepository<SubscriptionHistory, UUID> {
    List<SubscriptionHistory> findByMemberIdOrderByCreatedAtDesc(UUID memberId);

    @Query("SELECT COALESCE(SUM(s.price), 0) FROM SubscriptionHistory s WHERE s.createdAt >= :since")
    double sumRevenueSince(LocalDateTime since);

    @Query("SELECT s FROM SubscriptionHistory s WHERE s.memberId IN :memberIds AND s.createdAt BETWEEN :start AND :end ORDER BY s.createdAt DESC")
    List<SubscriptionHistory> findByMemberIdsAndDateRange(List<UUID> memberIds, LocalDateTime start, LocalDateTime end);
}
