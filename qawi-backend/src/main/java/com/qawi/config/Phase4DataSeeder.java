package com.qawi.config;

import com.qawi.entity.*;
import com.qawi.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
@Order(3)
public class Phase4DataSeeder implements ApplicationRunner {

    private final UserRepository userRepository;
    private final SubscriptionHistoryRepository subscriptionHistoryRepository;

    @Override
    public void run(ApplicationArguments args) {
        if (subscriptionHistoryRepository.count() > 0) {
            log.info("Phase 4 data already seeded, skipping.");
            return;
        }

        List<User> admins = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.GYM_ADMIN).toList();

        if (admins.isEmpty()) {
            log.info("No gym admin found, skipping Phase 4 seeding.");
            return;
        }

        User admin = admins.get(0);

        List<User> members = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.MEMBER).toList();

        // Seed SubscriptionHistory for Sam and Riley (first 2 members with subscriptions)
        members.stream()
                .filter(m -> m.getSubscriptionEndDate() != null)
                .filter(m -> !m.getEmail().equals("drew@ironpeak.com"))
                .limit(2)
                .forEach(member -> {
                    // First subscription — 60 days ago
                    subscriptionHistoryRepository.save(SubscriptionHistory.builder()
                            .memberId(member.getId())
                            .managedByAdminId(admin.getId())
                            .startDate(LocalDate.now().minusDays(60))
                            .endDate(LocalDate.now().minusDays(30))
                            .plan(MemberSubscriptionPlan.MONTHLY)
                            .price(49.0)
                            .build());

                    // Current subscription — 30 days ago
                    subscriptionHistoryRepository.save(SubscriptionHistory.builder()
                            .memberId(member.getId())
                            .managedByAdminId(admin.getId())
                            .startDate(LocalDate.now().minusDays(30))
                            .endDate(LocalDate.now().plusDays(30))
                            .plan(MemberSubscriptionPlan.MONTHLY)
                            .price(49.0)
                            .build());
                });

        log.info("Phase 4 seeding complete. SubscriptionHistory records: {}",
                subscriptionHistoryRepository.count());
    }
}
