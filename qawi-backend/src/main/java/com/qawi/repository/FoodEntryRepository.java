package com.qawi.repository;

import com.qawi.entity.FoodEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface FoodEntryRepository extends JpaRepository<FoodEntry, UUID> {

    @Query("SELECT f FROM FoodEntry f WHERE f.memberId = :memberId " +
           "AND f.loggedAt >= :startOfDay AND f.loggedAt < :endOfDay ORDER BY f.loggedAt ASC")
    List<FoodEntry> findTodayEntries(@Param("memberId") UUID memberId,
                                     @Param("startOfDay") LocalDateTime startOfDay,
                                     @Param("endOfDay") LocalDateTime endOfDay);

    @Query("SELECT f FROM FoodEntry f WHERE f.memberId = :memberId ORDER BY f.loggedAt DESC")
    List<FoodEntry> findByMemberIdOrderByLoggedAtDesc(@Param("memberId") UUID memberId);

    @Query("SELECT f FROM FoodEntry f WHERE f.memberId = :memberId " +
           "AND f.loggedAt >= :from AND f.loggedAt < :to ORDER BY f.loggedAt DESC")
    List<FoodEntry> findByMemberIdAndDateRange(@Param("memberId") UUID memberId,
                                               @Param("from") LocalDateTime from,
                                               @Param("to") LocalDateTime to);
}
