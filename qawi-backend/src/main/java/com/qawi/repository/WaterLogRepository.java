package com.qawi.repository;

import com.qawi.entity.WaterLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface WaterLogRepository extends JpaRepository<WaterLog, UUID> {

    @Query("SELECT w FROM WaterLog w WHERE w.memberId = :memberId " +
           "AND w.loggedAt >= :startOfDay AND w.loggedAt < :endOfDay ORDER BY w.loggedAt ASC")
    List<WaterLog> findTodayLogs(@Param("memberId") UUID memberId,
                                 @Param("startOfDay") LocalDateTime startOfDay,
                                 @Param("endOfDay") LocalDateTime endOfDay);

    @Query("SELECT COALESCE(SUM(w.amountMl), 0) FROM WaterLog w WHERE w.memberId = :memberId " +
           "AND w.loggedAt >= :startOfDay AND w.loggedAt < :endOfDay")
    int sumTodayWater(@Param("memberId") UUID memberId,
                      @Param("startOfDay") LocalDateTime startOfDay,
                      @Param("endOfDay") LocalDateTime endOfDay);
}
