package com.qawi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "schedule_days")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScheduleDay {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "workout_plan_id", nullable = false)
    private UUID workoutPlanId;

    @Column(name = "day_date", nullable = false)
    private LocalDate dayDate;

    @Column(name = "day_name", nullable = false)
    private String dayName;

    @Column(name = "day_name_ar", nullable = false)
    private String dayNameAr;

    @Column(name = "is_rest_day", nullable = false)
    @Builder.Default
    private boolean isRestDay = false;

    @Column(name = "is_completed", nullable = false)
    @Builder.Default
    private boolean isCompleted = false;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;
}
