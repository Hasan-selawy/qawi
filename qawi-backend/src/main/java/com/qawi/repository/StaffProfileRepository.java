package com.qawi.repository;

import com.qawi.entity.StaffProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StaffProfileRepository extends JpaRepository<StaffProfile, UUID> {
    List<StaffProfile> findByGymIdAndActiveTrue(UUID gymId);
    Optional<StaffProfile> findByUserId(UUID userId);
    Optional<StaffProfile> findByUserIdAndGymId(UUID userId, UUID gymId);
    List<StaffProfile> findByGymId(UUID gymId);

    @Query("SELECT COUNT(sp) FROM StaffProfile sp WHERE sp.gymId = :gymId AND sp.active = true")
    long countActiveByGymId(@Param("gymId") UUID gymId);
}
