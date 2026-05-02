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
}
