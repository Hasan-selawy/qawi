package com.qawi.repository;

import com.qawi.entity.MemberReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MemberReportRepository extends JpaRepository<MemberReport, UUID> {
    List<MemberReport> findByGymIdOrderByCreatedAtDesc(UUID gymId);
}
