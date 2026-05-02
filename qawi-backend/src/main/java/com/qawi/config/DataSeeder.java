package com.qawi.config;

import com.qawi.entity.*;
import com.qawi.repository.CoachMemberRepository;
import com.qawi.repository.GymRepository;
import com.qawi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements ApplicationRunner {

    private final GymRepository gymRepository;
    private final UserRepository userRepository;
    private final CoachMemberRepository coachMemberRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.count() > 0) {
            seedSuperAdminIfMissing();
            return;
        }

        log.info("Seeding database...");
        String hashed = passwordEncoder.encode("password123");

        // SUPER_ADMIN
        userRepository.save(User.builder()
                .name("Qawi Admin")
                .email("super@qawi.com")
                .password(passwordEncoder.encode("qawi_super_2024"))
                .role(Role.SUPER_ADMIN)
                .build());

        // Gym
        Gym gym = gymRepository.save(Gym.builder()
                .name("Iron Peak Gym")
                .ownerId(java.util.UUID.randomUUID())
                .subscriptionPlan(SubscriptionPlan.PRO)
                .subscriptionExpiresAt(LocalDateTime.now().plusYears(1))
                .build());

        // GYM_ADMIN
        User admin = userRepository.save(User.builder()
                .name("Admin")
                .email("admin@ironpeak.com")
                .password(hashed)
                .role(Role.GYM_ADMIN)
                .gymId(gym.getId())
                .build());

        gym.setOwnerId(admin.getId());
        gymRepository.save(gym);

        // Coaches
        User jordan = userRepository.save(User.builder()
                .name("Coach Jordan")
                .email("coach.jordan@ironpeak.com")
                .password(hashed)
                .role(Role.COACH)
                .gymId(gym.getId())
                .build());

        User morgan = userRepository.save(User.builder()
                .name("Coach Morgan")
                .email("coach.morgan@ironpeak.com")
                .password(hashed)
                .role(Role.COACH)
                .gymId(gym.getId())
                .build());

        // Members
        LocalDate today = LocalDate.now();

        User sam = userRepository.save(User.builder()
                .name("Sam").email("sam@ironpeak.com").password(hashed)
                .role(Role.MEMBER).gymId(gym.getId())
                .subscriptionStartDate(today.minusDays(30))
                .subscriptionEndDate(today.plusDays(30))
                .build());

        User casey = userRepository.save(User.builder()
                .name("Casey").email("casey@ironpeak.com").password(hashed)
                .role(Role.MEMBER).gymId(gym.getId())
                .subscriptionStartDate(today.minusDays(25))
                .subscriptionEndDate(today.plusDays(5))
                .build());

        User riley = userRepository.save(User.builder()
                .name("Riley").email("riley@ironpeak.com").password(hashed)
                .role(Role.MEMBER).gymId(gym.getId())
                .subscriptionStartDate(today.minusDays(30))
                .subscriptionEndDate(today.plusDays(30))
                .build());

        User drew = userRepository.save(User.builder()
                .name("Drew").email("drew@ironpeak.com").password(hashed)
                .role(Role.MEMBER).gymId(gym.getId())
                .subscriptionStartDate(today.minusDays(60))
                .subscriptionEndDate(today.minusDays(5))
                .build());

        // Coach assignments
        coachMemberRepository.save(CoachMember.builder().coachId(jordan.getId()).memberId(sam.getId()).build());
        coachMemberRepository.save(CoachMember.builder().coachId(jordan.getId()).memberId(casey.getId()).build());
        coachMemberRepository.save(CoachMember.builder().coachId(morgan.getId()).memberId(riley.getId()).build());
        coachMemberRepository.save(CoachMember.builder().coachId(morgan.getId()).memberId(drew.getId()).build());

        log.info("Seeding complete. Users: {}", userRepository.count());
    }

    private void seedSuperAdminIfMissing() {
        if (!userRepository.existsByEmail("super@qawi.com")) {
            log.info("Adding SUPER_ADMIN seed user...");
            userRepository.save(User.builder()
                    .name("Qawi Admin")
                    .email("super@qawi.com")
                    .password(passwordEncoder.encode("qawi_super_2024"))
                    .role(Role.SUPER_ADMIN)
                    .build());
            log.info("SUPER_ADMIN created.");
        }
    }
}
