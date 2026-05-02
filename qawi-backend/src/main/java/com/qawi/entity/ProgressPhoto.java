package com.qawi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "progress_photos")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProgressPhoto {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "member_id", nullable = false)
    private UUID memberId;

    @Column(name = "photo_url", nullable = false)
    private String photoUrl;

    private String caption;

    @Column(name = "taken_at", nullable = false)
    private LocalDate takenAt;

    @Column(name = "uploaded_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime uploadedAt = LocalDateTime.now();
}
