package com.qawi.repository;

import com.qawi.entity.AiNutritionLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.UUID;

public interface AiNutritionLogRepository extends JpaRepository<AiNutritionLog, UUID> {

    @Query("SELECT COUNT(l) FROM AiNutritionLog l WHERE l.memberId = :memberId " +
           "AND l.createdAt >= :since AND l.success = true")
    long countSuccessfulSince(@Param("memberId") UUID memberId, @Param("since") LocalDateTime since);
}
