package com.qawi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "gym_exercise_overrides",
        uniqueConstraints = @UniqueConstraint(name = "uk_gym_exercise_override", columnNames = {"gym_id", "exercise_template_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GymExerciseOverride {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "gym_id", nullable = false)
    private UUID gymId;

    @Column(name = "exercise_template_id", nullable = false)
    private UUID exerciseTemplateId;

    @Column(nullable = false)
    private String name;

    @Column(name = "name_ar", nullable = false)
    private String nameAr;

    @Column(name = "video_url")
    private String videoUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
