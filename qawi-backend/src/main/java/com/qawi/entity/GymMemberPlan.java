package com.qawi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "gym_member_plans")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GymMemberPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "gym_id", nullable = false)
    private UUID gymId;

    @Column(nullable = false)
    private String name;

    @Column(name = "name_ar")
    private String nameAr;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MemberPlanDuration duration;

    @Column(nullable = false, precision = 10, scale = 3)
    private BigDecimal price;

    @Column(length = 500)
    private String description;

    @Column(name = "description_ar", length = 500)
    private String descriptionAr;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
