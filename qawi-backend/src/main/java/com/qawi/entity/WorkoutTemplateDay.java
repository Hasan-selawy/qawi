package com.qawi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "workout_template_days")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkoutTemplateDay {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "template_id", nullable = false)
    private UUID templateId;

    @Column(name = "day_number", nullable = false)
    private int dayNumber;

    @Column(name = "day_name", nullable = false)
    private String dayName;

    @Column(name = "day_name_ar", nullable = false)
    private String dayNameAr;

    @Column(name = "is_rest_day", nullable = false)
    @Builder.Default
    private boolean isRestDay = false;
}
