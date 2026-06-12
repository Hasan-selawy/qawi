package com.qawi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "nutrition_targets")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NutritionTarget {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "member_id", nullable = false, unique = true)
    private UUID memberId;

    @Column(name = "gym_id")
    private UUID gymId;

    @Column(name = "coach_id")
    private UUID coachId;

    @Column(name = "created_by_user_id")
    private UUID createdByUserId;

    @Column(name = "created_by_role")
    private String createdByRole;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "calories")
    private Integer calories;

    @Column(name = "protein_g")
    private Integer proteinG;

    @Column(name = "carbs_g")
    private Integer carbsG;

    @Column(name = "fat_g")
    private Integer fatG;

    @Column(name = "water_ml")
    private Integer waterMl;

    @Enumerated(EnumType.STRING)
    @Column(name = "goal")
    private NutritionGoal goal;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
