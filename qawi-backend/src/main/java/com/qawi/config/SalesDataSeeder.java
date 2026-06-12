package com.qawi.config;

import com.qawi.entity.*;
import com.qawi.repository.*;
import com.qawi.service.MemberLeadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
@Order(20)
public class SalesDataSeeder implements ApplicationRunner {

    private final GymRepository gymRepository;
    private final UserRepository userRepository;
    private final MemberLeadService memberLeadService;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(ApplicationArguments args) {
        // Seed SALES user for Iron Peak Gym
        Optional<Gym> gymOpt = gymRepository.findAll().stream()
                .filter(g -> g.getName().contains("Iron Peak"))
                .findFirst();

        if (gymOpt.isEmpty()) {
            log.debug("SalesDataSeeder: no Iron Peak Gym found yet, skipping.");
            return;
        }

        Gym gym = gymOpt.get();

        if (!userRepository.existsByEmail("sales@ironpeak.com")) {
            userRepository.save(User.builder()
                    .name("Sales Agent")
                    .email("sales@ironpeak.com")
                    .password(passwordEncoder.encode("password123"))
                    .role(Role.SALES)
                    .gymId(gym.getId())
                    .isActive(true)
                    .build());
            log.info("SalesDataSeeder: created sales@ironpeak.com");
        }

        // Idempotent member backfill
        memberLeadService.backfillGymMembers(gym.getId());
        log.info("SalesDataSeeder: member CRM backfill complete for gym '{}'", gym.getName());
    }
}
