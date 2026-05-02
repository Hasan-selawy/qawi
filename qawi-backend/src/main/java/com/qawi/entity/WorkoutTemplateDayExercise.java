package com.qawi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "workout_template_day_exercises")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkoutTemplateDayExercise {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "template_day_id", nullable = false)
    private UUID templateDayId;

    @Column(name = "exercise_template_id")
    private UUID exerciseTemplateId;

    @Column(name = "custom_name")
    private String customName;

    @Column(name = "custom_name_ar")
    private String customNameAr;

    @Column(nullable = false)
    private int sets;

    @Column(nullable = false)
    private int reps;

    @Column(name = "target_weight", nullable = false)
    private double targetWeight;

    @Column(name = "video_url")
    private String videoUrl;

    @Column(name = "order_index", nullable = false)
    private int orderIndex;
}
