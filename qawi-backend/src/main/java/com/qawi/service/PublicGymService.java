package com.qawi.service;

import com.qawi.dto.ContactRequestCreate;
import com.qawi.dto.ContactResponse;
import com.qawi.dto.GymDetailResponse;
import com.qawi.dto.PlanInfo;
import com.qawi.dto.RegisterGymResponse;
import com.qawi.dto.RegisterGymRequest;
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
    private final ContactRequestRepository contactRequestRepository;
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

    @Transactional(readOnly = true)
    public List<PlanInfo> getPlans() {
        return List.of(
                PlanInfo.builder()
                        .plan(SubscriptionPlan.BASIC)
                        .price(30)
                        .currency("JOD")
                        .billingCycle("monthly")
                        .yearlyPrice(300)
                        .yearlySavings(60)
                        .maxMembers(50)
                        .maxCoaches(3)
                        .build(),
                PlanInfo.builder()
                        .plan(SubscriptionPlan.PRO)
                        .price(60)
                        .currency("JOD")
                        .billingCycle("monthly")
                        .yearlyPrice(600)
                        .yearlySavings(120)
                        .maxMembers(200)
                        .maxCoaches(10)
                        .build(),
                PlanInfo.builder()
                        .plan(SubscriptionPlan.ENTERPRISE)
                        .price(100)
                        .currency("JOD")
                        .billingCycle("monthly")
                        .yearlyPrice(1000)
                        .yearlySavings(200)
                        .maxMembers(Integer.MAX_VALUE)
                        .maxCoaches(Integer.MAX_VALUE)
                        .build()
        );
    }

    @Transactional
    public ContactResponse createContactRequest(ContactRequestCreate req) {
        contactRequestRepository.save(ContactRequest.builder()
                .fullName(req.getFullName())
                .phoneNumber(req.getPhoneNumber())
                .gymName(req.getGymName())
                .city(req.getCity())
                .message(req.getMessage())
                .build());
        return ContactResponse.builder()
                .message("We will contact you soon!")
                .messageAr("سنتواصل معك قريباً!")
                .build();
    }

    public boolean isEmailAvailable(String email) {
        return !userRepository.existsByEmail(email);
    }
}
