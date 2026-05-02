package com.qawi.repository;

import com.qawi.entity.Gym;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.UUID;

@Repository
public interface GymRepository extends JpaRepository<Gym, UUID> {

    boolean existsByName(String name);

    @Query("SELECT COUNT(g) FROM Gym g WHERE g.subscriptionExpiresAt > :now")
    long countActiveGyms(LocalDateTime now);

    @Query("SELECT COUNT(g) FROM Gym g WHERE g.subscriptionExpiresAt BETWEEN :now AND :cutoff")
    long countExpiringGyms(LocalDateTime now, LocalDateTime cutoff);
}
