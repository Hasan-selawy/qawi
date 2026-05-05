package com.qawi.repository;

import com.qawi.entity.GymClass;
import com.qawi.entity.GymClassStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface GymClassRepository extends JpaRepository<GymClass, UUID> {
    List<GymClass> findByGymIdOrderByDateTimeAsc(UUID gymId);
    List<GymClass> findByGymIdAndStatusAndDateTimeAfterOrderByDateTimeAsc(UUID gymId, GymClassStatus status, LocalDateTime after);
}
