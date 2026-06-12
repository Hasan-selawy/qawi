package com.qawi.repository;

import com.qawi.entity.GymLead;
import com.qawi.entity.GymLeadStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface GymLeadRepository extends JpaRepository<GymLead, UUID> {

    List<GymLead> findAllByOrderByCreatedAtDesc();

    List<GymLead> findByStatusOrderByCreatedAtDesc(GymLeadStatus status);

    List<GymLead> findByCityIgnoreCaseOrderByCreatedAtDesc(String city);

    List<GymLead> findByStatusAndCityIgnoreCaseOrderByCreatedAtDesc(GymLeadStatus status, String city);

    @Query("SELECT g FROM GymLead g WHERE g.nextFollowUpDate <= :today AND g.status NOT IN ('CONVERTED', 'LOST') ORDER BY g.nextFollowUpDate ASC")
    List<GymLead> findFollowUpsDueByToday(@Param("today") LocalDate today);

    @Query("SELECT g.status, COUNT(g) FROM GymLead g GROUP BY g.status")
    List<Object[]> countByStatus();
}
