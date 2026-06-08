package com.qawi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "water_logs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WaterLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "member_id", nullable = false)
    private UUID memberId;

    @Column(name = "amount_ml", nullable = false)
    private Integer amountMl;

    @Column(name = "logged_at", nullable = false)
    @Builder.Default
    private LocalDateTime loggedAt = LocalDateTime.now();
}
