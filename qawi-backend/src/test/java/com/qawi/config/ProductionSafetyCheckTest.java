package com.qawi.config;

import com.qawi.entity.Role;
import com.qawi.entity.User;
import com.qawi.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class ProductionSafetyCheckTest {
    private final UserRepository users = mock(UserRepository.class);
    private final PasswordEncoder passwords = new BCryptPasswordEncoder();
    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withUserConfiguration(ProductionSafetyCheck.class)
            .withBean(UserRepository.class, () -> users)
            .withBean(PasswordEncoder.class, () -> passwords)
            .withPropertyValues("spring.profiles.active=prod", "qawi.seed.enabled=false",
                    "app.jwt.secret=13f44eadbccb707cafe82409ba7c09379da3aa268696e4e9e9e2023d1ec922cb5");

    @Test
    void productionStartsWithExplicitKeyAndNoDefaultDemoAccounts() {
        runner.run(context -> assertThat(context).hasNotFailed());
    }

    @Test
    void productionRejectsMissingShortAndDevelopmentKeys() {
        for (String secret : new String[]{"", "short", "qawi-local-development-secret-change-before-production"}) {
            runner.withPropertyValues("app.jwt.secret=" + secret).run(context ->
                    assertThat(context).hasFailed());
        }
    }

    @Test
    void productionRejectsDemoSeedingAndLocalProfile() {
        runner.withPropertyValues("qawi.seed.enabled=true").run(context -> assertThat(context).hasFailed());
        runner.withPropertyValues("spring.profiles.active=prod,local")
                .run(context -> assertThat(context).hasFailed());
    }

    @Test
    void productionRejectsExistingDefaultDemoPassword() {
        when(users.findByEmail("super@qawi.com")).thenReturn(Optional.of(User.builder()
                .email("super@qawi.com").role(Role.SUPER_ADMIN)
                .password(passwords.encode("qawi_super_2024")).build()));
        runner.run(context -> assertThat(context).hasFailed());
    }

    @Test
    void demoSeedersAreAbsentByDefaultAndInProductionEvenWhenEnabled() {
        ApplicationContextRunner seeders = new ApplicationContextRunner().withUserConfiguration(
                DataSeeder.class, Phase3DataSeeder.class, Phase4DataSeeder.class, V3DataSeeder.class, SalesDataSeeder.class);
        seeders.run(context -> assertThat(context).hasNotFailed().doesNotHaveBean(DataSeeder.class));
        seeders.withPropertyValues("spring.profiles.active=prod", "qawi.seed.enabled=true")
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(context.getBeansOfType(org.springframework.boot.ApplicationRunner.class)).isEmpty();
                });
    }
}
