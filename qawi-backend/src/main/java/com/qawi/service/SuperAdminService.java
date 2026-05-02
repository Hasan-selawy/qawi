package com.qawi.service;

import com.qawi.dto.*;
import com.qawi.entity.*;
import com.qawi.exception.AppException;
import com.qawi.repository.GymRepository;
import com.qawi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SuperAdminService {

    private final GymRepository gymRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public CreateGymResponse createGym(CreateGymRequest req) {
        if (userRepository.existsByEmail(req.getAdminEmail())) {
            throw new AppException(
                    "Email already in use: " + req.getAdminEmail(),
                    "البريد الإلكتروني مستخدم بالفعل",
                    HttpStatus.CONFLICT
            );
        }

        Gym gym = gymRepository.save(Gym.builder()
                .name(req.getGymName())
                .ownerId(UUID.randomUUID())
                .subscriptionPlan(req.getSubscriptionPlan())
                .subscriptionExpiresAt(req.getSubscriptionExpiresAt())
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

        return CreateGymResponse.builder()
                .gym(toGymDetail(gym))
                .admin(UserDto.from(admin))
                .build();
    }

    @Transactional(readOnly = true)
    public List<GymDetailResponse> getAllGyms() {
        return gymRepository.findAll().stream()
                .map(this::toGymDetail)
                .toList();
    }

    @Transactional
    public GymDetailResponse updateSubscription(UUID gymId, UpdateSubscriptionRequest req) {
        Gym gym = gymRepository.findById(gymId)
                .orElseThrow(() -> new AppException("Gym not found", "الصالة غير موجودة", HttpStatus.NOT_FOUND));

        gym.setSubscriptionPlan(req.getSubscriptionPlan());
        gym.setSubscriptionExpiresAt(req.getSubscriptionExpiresAt());

        return toGymDetail(gymRepository.save(gym));
    }

    @Transactional
    public void deactivateGym(UUID gymId) {
        Gym gym = gymRepository.findById(gymId)
                .orElseThrow(() -> new AppException("Gym not found", "الصالة غير موجودة", HttpStatus.NOT_FOUND));

        List<User> users = userRepository.findByGymId(gymId);
        users.forEach(u -> u.setActive(false));
        userRepository.saveAll(users);
    }

    @Transactional(readOnly = true)
    public PlatformStatsResponse getStats() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime in30Days = now.plusDays(30);

        return PlatformStatsResponse.builder()
                .totalGyms(gymRepository.count())
                .totalMembers(userRepository.countByRole(Role.MEMBER))
                .totalCoaches(userRepository.countByRole(Role.COACH))
                .activeGyms(gymRepository.countActiveGyms(now))
                .expiringGyms(gymRepository.countExpiringGyms(now, in30Days))
                .build();
    }

    private GymDetailResponse toGymDetail(Gym gym) {
        long members = userRepository.countByGymIdAndRole(gym.getId(), Role.MEMBER);
        long coaches = userRepository.countByGymIdAndRole(gym.getId(), Role.COACH);

        String adminEmail = userRepository
                .findFirstByGymIdAndRole(gym.getId(), Role.GYM_ADMIN)
                .map(User::getEmail)
                .orElse(null);

        String status;
        if (gym.getSubscriptionExpiresAt() == null) {
            status = "UNKNOWN";
        } else if (gym.getSubscriptionExpiresAt().isBefore(LocalDateTime.now())) {
            status = "EXPIRED";
        } else if (gym.getSubscriptionExpiresAt().isBefore(LocalDateTime.now().plusDays(30))) {
            status = "EXPIRING_SOON";
        } else {
            status = "ACTIVE";
        }

        return GymDetailResponse.builder()
                .id(gym.getId())
                .name(gym.getName())
                .ownerId(gym.getOwnerId())
                .subscriptionPlan(gym.getSubscriptionPlan())
                .subscriptionExpiresAt(gym.getSubscriptionExpiresAt())
                .createdAt(gym.getCreatedAt())
                .adminEmail(adminEmail)
                .totalMembers(members)
                .totalCoaches(coaches)
                .subscriptionStatus(status)
                .build();
    }
}
