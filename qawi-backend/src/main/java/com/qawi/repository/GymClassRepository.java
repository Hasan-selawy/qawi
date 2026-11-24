package com.qawi.repository;

import com.qawi.entity.GymClass;
import com.qawi.entity.GymClassStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.LockModeType;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GymClassRepository extends JpaRepository<GymClass, UUID> {
    Optional<GymClass> findByIdAndGymId(UUID id, UUID gymId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from GymClass c where c.id = :id and c.gymId = :gymId")
    Optional<GymClass> findForUpdateByIdAndGymId(UUID id, UUID gymId);
    List<GymClass> findByGymIdOrderByDateTimeAsc(UUID gymId);
    List<GymClass> findByGymIdAndStatusAndDateTimeAfterOrderByDateTimeAsc(UUID gymId, GymClassStatus status, LocalDateTime after);
}
