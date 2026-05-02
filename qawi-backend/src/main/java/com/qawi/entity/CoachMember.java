package com.qawi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "coach_members",
       uniqueConstraints = @UniqueConstraint(columnNames = {"coach_id", "member_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CoachMember {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "coach_id", nullable = false)
    private UUID coachId;

    @Column(name = "member_id", nullable = false)
    private UUID memberId;
}
