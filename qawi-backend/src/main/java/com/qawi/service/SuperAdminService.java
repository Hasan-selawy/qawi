package com.qawi.service;

import com.qawi.dto.ContactRequestDto;
import com.qawi.dto.ContactResponse;
import com.qawi.dto.CreateGymRequest;
import com.qawi.dto.CreateGymResponse;
import com.qawi.dto.GymBrandingRequest;
import com.qawi.dto.GymDetailResponse;
import com.qawi.dto.GymFeaturesRequest;
import com.qawi.dto.GymLimitsRequest;
import com.qawi.dto.MarkContactedResponse;
import com.qawi.dto.PlatformStatsResponse;
import com.qawi.dto.UpdateSubscriptionRequest;
import com.qawi.dto.UserDto;
import com.qawi.entity.ContactRequest;
import com.qawi.entity.Gym;
import com.qawi.entity.Role;
import com.qawi.entity.SubscriptionPlan;
import com.qawi.entity.User;
import com.qawi.exception.AppException;
import com.qawi.repository.ContactRequestRepository;
import com.qawi.repository.GymRepository;
import com.qawi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SuperAdminService {

    private final GymRepository gymRepository;
    private final UserRepository userRepository;
    private final ContactRequestRepository contactRequestRepository;
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
                .subscriptionExpiresAt(req.getSubscriptionExpiresAt() != null
                        ? req.getSubscriptionExpiresAt().atStartOfDay()
                        : null)
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

    @Transactional(readOnly = true)
    public GymDetailResponse getGym(UUID gymId) {
        return toGymDetail(loadGym(gymId));
    }

    @Transactional
    public GymDetailResponse updateSubscription(UUID gymId, UpdateSubscriptionRequest req) {
        Gym gym = loadGym(gymId);
        gym.setSubscriptionPlan(req.getSubscriptionPlan());
        if (req.getSubscriptionExpiresAt() != null) {
            gym.setSubscriptionExpiresAt(req.getSubscriptionExpiresAt().atStartOfDay());
        }
        return toGymDetail(gymRepository.save(gym));
    }

    @Transactional
    public GymDetailResponse updateFeatures(UUID gymId, GymFeaturesRequest req) {
        Gym gym = loadGym(gymId);
        if (req.getNutritionEnabled() != null) gym.setNutritionEnabled(req.getNutritionEnabled());
        if (req.getPushNotificationsEnabled() != null) gym.setPushNotificationsEnabled(req.getPushNotificationsEnabled());
        if (req.getCustomBrandingEnabled() != null) gym.setCustomBrandingEnabled(req.getCustomBrandingEnabled());
        if (req.getClassBookingEnabled() != null) gym.setClassBookingEnabled(req.getClassBookingEnabled());
        if (req.getAnalyticsAdvancedEnabled() != null) gym.setAnalyticsAdvancedEnabled(req.getAnalyticsAdvancedEnabled());
        if (req.getNutritionWorkflow() != null) {
            try {
                gym.setNutritionWorkflow(com.qawi.entity.NutritionWorkflow.valueOf(req.getNutritionWorkflow()));
            } catch (IllegalArgumentException ignored) {}
        }
        return toGymDetail(gymRepository.save(gym));
    }

    @Transactional
    public GymDetailResponse updateLimits(UUID gymId, GymLimitsRequest req) {
        Gym gym = loadGym(gymId);
        gym.setMaxMembers(req.getMaxMembers());
        return toGymDetail(gymRepository.save(gym));
    }

    @Transactional
    public GymDetailResponse updateBranding(UUID gymId, GymBrandingRequest req) {
        Gym gym = loadGym(gymId);
        gym.setLogoUrl(emptyToNull(req.getLogoUrl()));
        gym.setPrimaryColor(emptyToNull(req.getPrimaryColor()));
        return toGymDetail(gymRepository.save(gym));
    }

    @Transactional
    public void deactivateGym(UUID gymId) {
        Gym gym = loadGym(gymId);
        List<User> users = userRepository.findByGymId(gym.getId());
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

    @Transactional(readOnly = true)
    public List<ContactRequestDto> getLeads(String filter) {
        return contactRequestRepository.findAll().stream()
                .filter(req -> filter == null || filter.equalsIgnoreCase("ALL") ||
                        ("PENDING".equalsIgnoreCase(filter) && !req.isContacted()) ||
                        ("CONTACTED".equalsIgnoreCase(filter) && req.isContacted()))
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public MarkContactedResponse markContacted(UUID id) {
        ContactRequest req = contactRequestRepository.findById(id)
                .orElseThrow(() -> new AppException("Lead not found", "العميل غير موجود", HttpStatus.NOT_FOUND));
        req.setContacted(true);
        contactRequestRepository.save(req);
        return MarkContactedResponse.builder().message("Lead marked as contacted").build();
    }

    private Gym loadGym(UUID gymId) {
        return gymRepository.findById(gymId)
                .orElseThrow(() -> new AppException("Gym not found", "الصالة غير موجودة", HttpStatus.NOT_FOUND));
    }

    private static String emptyToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }

    private ContactRequestDto toDto(ContactRequest req) {
        return ContactRequestDto.builder()
                .id(req.getId())
                .fullName(req.getFullName())
                .phoneNumber(req.getPhoneNumber())
                .gymName(req.getGymName())
                .city(req.getCity())
                .message(req.getMessage())
                .createdAt(req.getCreatedAt())
                .contacted(req.isContacted())
                .build();
    }

    private GymDetailResponse toGymDetail(Gym gym) {
        long members = userRepository.countByGymIdAndRole(gym.getId(), Role.MEMBER);
        long coaches = userRepository.countByGymIdAndRole(gym.getId(), Role.COACH);

        var adminUser = userRepository.findFirstByGymIdAndRole(gym.getId(), Role.GYM_ADMIN);
        String adminEmail = adminUser.map(User::getEmail).orElse(null);
        UUID adminId = adminUser.map(User::getId).orElse(null);

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
                .adminId(adminId)
                .adminEmail(adminEmail)
                .totalMembers(members)
                .totalCoaches(coaches)
                .subscriptionStatus(status)
                .nutritionEnabled(gym.isNutritionEnabled())
                .pushNotificationsEnabled(gym.isPushNotificationsEnabled())
                .customBrandingEnabled(gym.isCustomBrandingEnabled())
                .classBookingEnabled(gym.isClassBookingEnabled())
                .analyticsAdvancedEnabled(gym.isAnalyticsAdvancedEnabled())
                .nutritionWorkflow(gym.getNutritionWorkflow() != null ? gym.getNutritionWorkflow().name() : "COACH_ONLY")
                .maxMembers(gym.getMaxMembers())
                .logoUrl(gym.getLogoUrl())
                .primaryColor(gym.getPrimaryColor())
                .build();
    }

    @org.springframework.transaction.annotation.Transactional
    public void resetPassword(UUID userId, String newPassword) {
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));
        if (target.getRole() == Role.SUPER_ADMIN) {
            throw new AppException("Cannot reset super admin password", "لا يمكن إعادة تعيين كلمة مرور المسؤول العام", HttpStatus.FORBIDDEN);
        }
        target.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(target);
    }
}
