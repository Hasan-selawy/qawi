package com.qawi.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "biometric_erasure_jobs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BiometricErasureJob {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(name = "gym_id", nullable = false) private UUID gymId;
    @Column(name = "member_id") private UUID memberId;
    @Column(name = "device_serial") private String deviceSerial;
    @Column(name = "device_user_id") private String deviceUserId;
    @Column(name = "requested_at", nullable = false) @Builder.Default
    private LocalDateTime requestedAt = LocalDateTime.now();
    @Column(name = "confirmed_at") private LocalDateTime confirmedAt;
}
