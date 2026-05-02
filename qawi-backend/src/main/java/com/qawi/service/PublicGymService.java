package com.qawi.service;

import com.qawi.dto.*;
import com.qawi.entity.*;
import com.qawi.exception.AppException;
import com.qawi.repository.GymRepository;
import com.qawi.repository.UserRepository;
import com.qawi.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PublicGymService {

    private final GymRepository gymRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional
    public RegisterGymResponse registerGym(RegisterGymRequest req) {
        if (userRepository.existsByEmail(req.getAdminEmail())) {
            throw new AppException(
                    "Email already registered",
                    "البريد الإلكتروني مسجل مسبقاً",
                    HttpStatus.CONFLICT
            );
        }

        if (gymRepository.existsByName(req.getGymName())) {
            throw new AppException(
                    "Gym name already exists",
                    "اسم الصالة مسجل مسبقاً",
                    HttpStatus.CONFLICT
            );
        }

        LocalDateTime trialExpiresAt = LocalDateTime.now().plusDays(14);

        Gym gym = gymRepository.save(Gym.builder()
                .name(req.getGymName())
                .ownerId(null)
                .subscriptionPlan(req.getSubscriptionPlan())
                .subscriptionExpiresAt(trialExpiresAt)
                .build());

        User admin = userRepository.save(User.builder()
                .name(req.getAdminName())
                .email(req.getAdminEmail())
                .password(passwordEncoder.encode(req.getAdminPassword()))
                .role(Role.GYM_ADMIN)
                .gymId(gym.getId())
                .build());

        gym.setOwnerId(admin.getId());
        gymRepository.save(gym);

        GymDetailResponse gymDetail = GymDetailResponse.builder()
                .id(gym.getId())
                .name(gym.getName())
                .ownerId(admin.getId())
                .subscriptionPlan(gym.getSubscriptionPlan())
                .subscriptionExpiresAt(trialExpiresAt)
                .createdAt(gym.getCreatedAt())
                .adminEmail(admin.getEmail())
                .totalMembers(0)
                .totalCoaches(0)
                .subscriptionStatus("ACTIVE")
                .build();

        return RegisterGymResponse.builder()
                .token(jwtService.generateToken(admin))
                .user(UserDto.from(admin))
                .gym(gymDetail)
                .trialExpiresAt(trialExpiresAt)
                .message("Welcome to Qawi! Your 14-day free trial has started.")
                .messageAr("مرحباً بك في قوي! بدأت تجربتك المجانية لمدة 14 يوماً.")
                .build();
    }

    public List<PlanInfo> getPlans() {
        return List.of(
                PlanInfo.builder()
                        .plan(SubscriptionPlan.BASIC)
                        .price(49)
                        .currency("USD")
                        .maxMembers(50)
                        .maxCoaches(3)
                        .build(),
                PlanInfo.builder()
                        .plan(SubscriptionPlan.PRO)
                        .price(99)
                        .currency("USD")
                        .maxMembers(200)
                        .maxCoaches(10)
                        .build(),
                PlanInfo.builder()
                        .plan(SubscriptionPlan.ENTERPRISE)
                        .price(199)
                        .currency("USD")
                        .maxMembers(999)
                        .maxCoaches(999)
                        .build()
        );
    }

    public boolean isEmailAvailable(String email) {
        return !userRepository.existsByEmail(email);
    }
}
