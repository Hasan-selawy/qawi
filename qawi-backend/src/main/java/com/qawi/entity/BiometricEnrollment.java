package com.qawi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "biometric_enrollments")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BiometricEnrollment {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "gym_id", nullable = false)
    private UUID gymId;

    @Column(name = "member_id", nullable = false)
    private UUID memberId;

    @Column(name = "device_serial", nullable = false)
    private String deviceSerial;

    @Column(name = "device_user_id", nullable = false)
    private String deviceUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "template_type", nullable = false)
    @Builder.Default
    private TemplateType templateType = TemplateType.UNKNOWN;

    @Column(name = "enrolled_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime enrolledAt = LocalDateTime.now();

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;
}
