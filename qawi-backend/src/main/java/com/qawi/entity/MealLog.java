package com.qawi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "meal_logs", uniqueConstraints = {
        @UniqueConstraint(name = "uk_meal_log_member_meal_date", columnNames = {"member_id", "meal_id", "log_date"})
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MealLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "member_id", nullable = false)
    private UUID memberId;

    @Column(name = "meal_id", nullable = false)
    private UUID mealId;

    @Column(name = "log_date", nullable = false)
    private LocalDate logDate;

    @Column(name = "logged_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime loggedAt = LocalDateTime.now();
}
