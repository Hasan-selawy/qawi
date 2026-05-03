package com.qawi.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "exercise_templates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExerciseTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "category_id", nullable = false)
    private UUID categoryId;

    @Column(nullable = false)
    private String name;

    @Column(name = "name_ar", nullable = false)
    private String nameAr;

    @Column(name = "default_sets", nullable = false)
    private int defaultSets;

    @Column(name = "default_reps", nullable = false)
    private int defaultReps;

    @Column(name = "default_weight", nullable = false)
    private double defaultWeight;

    @Column(name = "video_url")
    private String videoUrl;

    @Column(name = "is_custom", nullable = false)
    @Builder.Default
    @JsonProperty("isCustom")
    private boolean isCustom = false;

    @Column(name = "created_by_coach_id")
    private UUID createdByCoachId;
}
