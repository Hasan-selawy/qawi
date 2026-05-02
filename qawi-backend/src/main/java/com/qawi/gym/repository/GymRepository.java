package com.qawi.gym.repository;

import com.qawi.gym.entity.Gym;
import com.qawi.gym.entity.enums.GymStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GymRepository extends JpaRepository<Gym, Long> {
    Page<Gym> findByStatus(GymStatus status, Pageable pageable);
    List<Gym> findByOwnerId(Long ownerId);
    boolean existsByEmail(String email);

    @Query("SELECT COUNT(m) FROM Member m WHERE m.gym.id = :gymId AND m.status = 'ACTIVE'")
    long countActiveMembers(Long gymId);
}
