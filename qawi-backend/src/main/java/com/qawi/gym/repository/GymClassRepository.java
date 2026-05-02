package com.qawi.gym.repository;

import com.qawi.gym.entity.GymClass;
import com.qawi.gym.entity.enums.ClassStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface GymClassRepository extends JpaRepository<GymClass, Long> {
    Page<GymClass> findByGymId(Long gymId, Pageable pageable);
    List<GymClass> findByGymIdAndStatus(Long gymId, ClassStatus status);

    @Query("SELECT gc FROM GymClass gc WHERE gc.gym.id = :gymId " +
           "AND gc.startTime BETWEEN :from AND :to ORDER BY gc.startTime ASC")
    List<GymClass> findByGymIdAndDateRange(@Param("gymId") Long gymId,
                                           @Param("from") LocalDateTime from,
                                           @Param("to") LocalDateTime to);

    @Query("SELECT gc FROM GymClass gc WHERE gc.trainer.id = :trainerId ORDER BY gc.startTime ASC")
    List<GymClass> findByTrainerId(@Param("trainerId") Long trainerId);
}
