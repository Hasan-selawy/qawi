package com.qawi.gym.entity;

import com.qawi.gym.entity.enums.GymStatus;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "gyms")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Gym extends BaseEntity {

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "name_ar")
    private String nameAr;

    @Column(name = "address")
    private String address;

    @Column(name = "city")
    private String city;

    @Column(name = "country")
    @Builder.Default
    private String country = "SA";

    @Column(name = "phone")
    private String phone;

    @Column(name = "email")
    private String email;

    @Column(name = "logo_url")
    private String logoUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private GymStatus status = GymStatus.ACTIVE;

    @Column(name = "owner_id")
    private Long ownerId;

    @Column(name = "max_members")
    @Builder.Default
    private Integer maxMembers = 500;

    @OneToMany(mappedBy = "gym", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<MembershipPlan> membershipPlans = new ArrayList<>();
}
