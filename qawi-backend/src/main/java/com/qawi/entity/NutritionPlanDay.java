package com.qawi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "nutrition_plan_days")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NutritionPlanDay {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "plan_id", nullable = false)
    private UUID planId;

    @Column(name = "gym_id", nullable = false)
    private UUID gymId;

    @Column(name = "member_id", nullable = false)
    private UUID memberId;

    @Column(name = "day_date", nullable = false)
    private LocalDate dayDate;

    @Column(name = "day_name")
    private String dayName;

    @Column(name = "day_name_ar")
    private String dayNameAr;

    @Column(name = "target_calories")
    private Integer targetCalories;

    @Column(name = "target_protein")
    private Integer targetProtein;

    @Column(name = "target_carbs")
    private Integer targetCarbs;

    @Column(name = "target_fat")
    private Integer targetFat;

    @Column(name = "target_water")
    private Integer targetWater;

    @Column(name = "goal")
    private String goal;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "notes_ar", columnDefinition = "TEXT")
    private String notesAr;

    @Column(name = "is_completed")
    private Boolean isCompleted;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
