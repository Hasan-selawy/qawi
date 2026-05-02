package com.qawi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "body_measurements")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BodyMeasurement {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "member_id", nullable = false)
    private UUID memberId;

    @Column(name = "recorded_by", nullable = false)
    private UUID recordedBy;

    private Double weight;
    private Double height;
    private Double chest;
    private Double waist;
    private Double hips;
    private Double arms;
    private Double legs;

    @Column(name = "body_fat_percentage")
    private Double bodyFatPercentage;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "recorded_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime recordedAt = LocalDateTime.now();
}
