package com.qawi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "arabic_food_cache")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ArabicFoodCache {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "food_name", nullable = false)
    private String foodName;

    @Column(name = "food_name_ar")
    private String foodNameAr;

    @Column(name = "search_keywords", columnDefinition = "TEXT")
    private String searchKeywords;

    @Column(name = "default_quantity", nullable = false)
    private Double defaultQuantity;

    @Column(name = "default_unit", nullable = false)
    private String defaultUnit;

    @Column(name = "calories", nullable = false)
    private Double calories;

    @Column(name = "protein", nullable = false)
    private Double protein;

    @Column(name = "carbs", nullable = false)
    private Double carbs;

    @Column(name = "fat", nullable = false)
    private Double fat;

    @Column(name = "fiber")
    private Double fiber;

    @Column(name = "sugar")
    private Double sugar;

    @Column(name = "sodium")
    private Double sodium;

    @Column(name = "source", nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ArabicFoodSource source = ArabicFoodSource.SEEDED;

    @Column(name = "search_count")
    @Builder.Default
    private Integer searchCount = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
