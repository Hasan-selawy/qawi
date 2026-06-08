package com.qawi.repository;

import com.qawi.entity.StaffAttendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StaffAttendanceRepository extends JpaRepository<StaffAttendance, UUID> {
    List<StaffAttendance> findByStaffId(UUID staffId);
    List<StaffAttendance> findByStaffIdAndDateBetween(UUID staffId, LocalDate from, LocalDate to);
    Optional<StaffAttendance> findByStaffIdAndDate(UUID staffId, LocalDate date);

    @Query("SELECT sa FROM StaffAttendance sa WHERE sa.staffId IN :staffIds AND sa.date = :date")
    List<StaffAttendance> findByStaffIdsAndDate(@Param("staffIds") List<UUID> staffIds, @Param("date") LocalDate date);

    @Query("SELECT sa FROM StaffAttendance sa WHERE sa.staffId IN :staffIds AND sa.date BETWEEN :from AND :to")
    List<StaffAttendance> findByStaffIdsAndDateRange(@Param("staffIds") List<UUID> staffIds,
                                                       @Param("from") LocalDate from,
                                                       @Param("to") LocalDate to);
}
