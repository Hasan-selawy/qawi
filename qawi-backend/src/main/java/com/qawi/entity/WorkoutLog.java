package com.qawi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "workout_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkoutLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "member_id", nullable = false)
    private UUID memberId;

    @Column(name = "plan_exercise_id", nullable = false)
    private UUID planExerciseId;

    @Column(name = "actual_sets", nullable = false)
    private int actualSets;

    @Column(name = "actual_reps", nullable = false)
    private int actualReps;

    @Column(name = "actual_weight", nullable = false)
    private double actualWeight;

    @Column(name = "notes", length = 500)
    private String notes;

    @Column(name = "logged_at", nullable = false)
    @Builder.Default
    private LocalDateTime loggedAt = LocalDateTime.now();
}
