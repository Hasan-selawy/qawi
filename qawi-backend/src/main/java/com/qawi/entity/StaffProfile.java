package com.qawi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "staff_profiles")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StaffProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "gym_id", nullable = false)
    private UUID gymId;

    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;

    @Column(name = "job_title")
    private String jobTitle;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "salary", precision = 10, scale = 3)
    private BigDecimal salary;

    @Enumerated(EnumType.STRING)
    @Column(name = "employment_type")
    private EmploymentType employmentType;

    @Column(name = "emergency_contact")
    private String emergencyContact;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
