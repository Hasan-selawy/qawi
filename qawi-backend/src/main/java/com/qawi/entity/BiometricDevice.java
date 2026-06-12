package com.qawi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "biometric_devices",
        uniqueConstraints = @UniqueConstraint(columnNames = {"device_serial"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BiometricDevice {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "gym_id", nullable = false)
    private UUID gymId;

    @Column(name = "device_serial", nullable = false, unique = true)
    private String deviceSerial;

    @Column(name = "device_name", nullable = false)
    private String deviceName;

    @Column(name = "device_model")
    private String deviceModel;

    @Column(name = "location")
    private String location;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @Column(name = "last_seen_at")
    private LocalDateTime lastSeenAt;

    @Column(name = "registered_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime registeredAt = LocalDateTime.now();
}
