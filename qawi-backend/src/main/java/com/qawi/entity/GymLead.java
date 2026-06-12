package com.qawi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "gym_leads")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GymLead {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String gymName;

    @Column(nullable = false)
    private String contactName;

    @Column(nullable = false)
    private String phoneNumber;

    @Column(nullable = false)
    private String city;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private GymLeadSource source = GymLeadSource.MANUAL_VISIT;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private GymLeadStatus status = GymLeadStatus.NEW;

    private String potentialPlanId;

    @Column(columnDefinition = "text")
    private String notes;

    private LocalDate nextFollowUpDate;

    private LocalDateTime lastContactedAt;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    private LocalDateTime statusChangedAt = LocalDateTime.now();

    private String assignedTo;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "gym_lead_notes", joinColumns = @JoinColumn(name = "lead_id"))
    @OrderBy("created_at DESC")
    @Builder.Default
    private List<GymLeadNote> noteHistory = new ArrayList<>();
}
