package com.qawi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "meals")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Meal {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "nutrition_plan_id", nullable = false)
    private UUID nutritionPlanId;

    @Enumerated(EnumType.STRING)
    @Column(name = "meal_type", nullable = false)
    private MealType mealType;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "description_ar", nullable = false, columnDefinition = "TEXT")
    private String descriptionAr;

    private Integer calories;

    private Integer protein;

    @Column(name = "order_index", nullable = false)
    private int orderIndex;
}
