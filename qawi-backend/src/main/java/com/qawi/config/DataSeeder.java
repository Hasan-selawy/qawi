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
            log.info("Database already seeded, skipping.");
            return;
        }

        log.info("Seeding database...");
        String hashed = passwordEncoder.encode("password123");

        // 1. Create Gym
        Gym gym = gymRepository.save(Gym.builder()
                .name("Iron Peak Gym")
                .ownerId(java.util.UUID.randomUUID())
                .subscriptionPlan(SubscriptionPlan.PRO)
                .subscriptionExpiresAt(LocalDateTime.now().plusYears(1))
                .build());

        // 2. GYM_ADMIN
        User admin = userRepository.save(User.builder()
                .name("Admin")
                .email("admin@ironpeak.com")
                .password(hashed)
                .role(Role.GYM_ADMIN)
                .gymId(gym.getId())
                .build());

        // 3. Coaches
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

        // 4. Members
        LocalDate today = LocalDate.now();

        // Sam: ends in 30 days
        User sam = userRepository.save(User.builder()
                .name("Sam")
                .email("sam@ironpeak.com")
                .password(hashed)
                .role(Role.MEMBER)
                .gymId(gym.getId())
                .subscriptionStartDate(today.minusDays(30))
                .subscriptionEndDate(today.plusDays(30))
                .build());

        // Casey: ends in 5 days (triggers alert)
        User casey = userRepository.save(User.builder()
                .name("Casey")
                .email("casey@ironpeak.com")
                .password(hashed)
                .role(Role.MEMBER)
                .gymId(gym.getId())
                .subscriptionStartDate(today.minusDays(25))
                .subscriptionEndDate(today.plusDays(5))
                .build());

        // Riley: ends in 30 days
        User riley = userRepository.save(User.builder()
                .name("Riley")
                .email("riley@ironpeak.com")
                .password(hashed)
                .role(Role.MEMBER)
                .gymId(gym.getId())
                .subscriptionStartDate(today.minusDays(30))
                .subscriptionEndDate(today.plusDays(30))
                .build());

        // Drew: subscription already expired (cannot login)
        User drew = userRepository.save(User.builder()
                .name("Drew")
                .email("drew@ironpeak.com")
                .password(hashed)
                .role(Role.MEMBER)
                .gymId(gym.getId())
                .subscriptionStartDate(today.minusDays(60))
                .subscriptionEndDate(today.minusDays(5))
                .build());

        // 5. CoachMember assignments
        // Jordan → Sam, Casey
        coachMemberRepository.save(CoachMember.builder()
                .coachId(jordan.getId()).memberId(sam.getId()).build());
        coachMemberRepository.save(CoachMember.builder()
                .coachId(jordan.getId()).memberId(casey.getId()).build());

        // Morgan → Riley, Drew
        coachMemberRepository.save(CoachMember.builder()
                .coachId(morgan.getId()).memberId(riley.getId()).build());
        coachMemberRepository.save(CoachMember.builder()
                .coachId(morgan.getId()).memberId(drew.getId()).build());

        log.info("Seeding complete. Gym: {}, Users: {}", gym.getName(), userRepository.count());
    }
}
