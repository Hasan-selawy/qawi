package com.qawi.config;

import com.qawi.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

/** Refuse known development credentials before the production application becomes available. */
@Component
@Profile("prod | staging")
@RequiredArgsConstructor
public class ProductionSafetyCheck {
    private final Environment environment;
    private final UserRepository users;
    private final PasswordEncoder passwords;

    @Value("${app.jwt.secret:}")
    private String jwtSecret;

    @PostConstruct
    void validate() {
        if (environment.acceptsProfiles(Profiles.of("local"))) {
            throw new IllegalStateException("The local profile cannot be combined with prod or staging");
        }
        if (environment.getProperty("qawi.seed.enabled", Boolean.class, false)) {
            throw new IllegalStateException("Demo seeding must be disabled in prod and staging");
        }
        String lower = jwtSecret.toLowerCase(java.util.Locale.ROOT);
        if (jwtSecret.getBytes(java.nio.charset.StandardCharsets.UTF_8).length < 32
                || lower.contains("qawi-local") || lower.contains("development")
                || lower.contains("change-before") || lower.contains("ci-only-test")) {
            throw new IllegalStateException("Set a unique production JWT_SECRET of at least 32 bytes");
        }
        for (String email : List.of("super@qawi.com", "admin@ironpeak.com", "coach.jordan@ironpeak.com",
                "coach.morgan@ironpeak.com", "sam@ironpeak.com", "casey@ironpeak.com",
                "riley@ironpeak.com", "drew@ironpeak.com", "nutritionist@ironpeak.com",
                "reception@ironpeak.com", "accountant@ironpeak.com", "hr@ironpeak.com", "sales@ironpeak.com")) {
            users.findByEmail(email).ifPresent(user -> {
                if (passwords.matches("password123", user.getPassword())
                        || passwords.matches("qawi_super_2024", user.getPassword())) {
                    throw new IllegalStateException("Rotate or remove default demo credentials before production: " + email);
                }
            });
        }
    }
}
