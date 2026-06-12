package com.qawi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "food_entries")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FoodEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "member_id", nullable = false)
    private UUID memberId;

    @Column(name = "gym_id")
    private UUID gymId;

    @Column(name = "log_date")
    private java.time.LocalDate logDate;

    @Column(name = "sodium")
    private Double sodium;

    @Column(name = "food_name", nullable = false)
    private String foodName;

    @Column(name = "food_name_ar")
    private String foodNameAr;

    @Column(name = "quantity")
    private Double quantity;

    @Column(name = "unit")
    private String unit;

    @Column(name = "calories")
    private Double calories;

    @Column(name = "protein_g")
    private Double proteinG;

    @Column(name = "carbs_g")
    private Double carbsG;

    @Column(name = "fat_g")
    private Double fatG;

    @Column(name = "fiber_g")
    private Double fiberG;

    @Column(name = "sugar_g")
    private Double sugarG;

    @Column(name = "confidence")
    private Double confidence;

    @Column(name = "source")
    @Builder.Default
    private String source = "AI";

    @Column(name = "meal_type")
    private String mealType;

    @Column(name = "raw_input")
    private String rawInput;

    @Column(name = "logged_at", nullable = false)
    @Builder.Default
    private LocalDateTime loggedAt = LocalDateTime.now();
}
