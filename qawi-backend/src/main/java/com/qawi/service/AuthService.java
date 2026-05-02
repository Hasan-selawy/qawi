package com.qawi.service;

import com.qawi.dto.AuthResponse;
import com.qawi.dto.LoginRequest;
import com.qawi.dto.RegisterRequest;
import com.qawi.dto.UserDto;
import com.qawi.entity.User;
import com.qawi.exception.AppException;
import com.qawi.repository.UserRepository;
import com.qawi.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;

    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new AppException(
                    "Email already in use",
                    "البريد الإلكتروني مستخدم بالفعل",
                    HttpStatus.CONFLICT
            );
        }

        User user = User.builder()
                .name(req.getName())
                .email(req.getEmail())
                .password(passwordEncoder.encode(req.getPassword()))
                .role(req.getRole())
                .gymId(req.getGymId())
                .build();

        userRepository.save(user);

        String token = jwtService.generateToken(user);
        return AuthResponse.builder()
                .token(token)
                .user(UserDto.from(user))
                .build();
    }

    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> new AppException(
                        "Invalid email or password",
                        "البريد الإلكتروني أو كلمة المرور غير صحيحة",
                        HttpStatus.UNAUTHORIZED
                ));

        // Block login if member subscription expired
        if (user.getRole().name().equals("MEMBER") && user.getSubscriptionEndDate() != null) {
            LocalDate today = LocalDate.now();
            if (user.getSubscriptionEndDate().isBefore(today)) {
                throw new AppException(
                        "Your subscription has expired. Please renew to access the gym.",
                        "انتهت صلاحية اشتراكك. يرجى التجديد للوصول إلى الصالة.",
                        HttpStatus.FORBIDDEN
                );
            }
        }

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.getEmail(), req.getPassword())
        );

        String token = jwtService.generateToken(user);

        AuthResponse.AuthResponseBuilder builder = AuthResponse.builder()
                .token(token)
                .user(UserDto.from(user));

        // Subscription alert if expires within 7 days
        if (user.getRole().name().equals("MEMBER") && user.getSubscriptionEndDate() != null) {
            LocalDate today = LocalDate.now();
            long daysLeft = ChronoUnit.DAYS.between(today, user.getSubscriptionEndDate());
            if (daysLeft >= 0 && daysLeft <= 7) {
                builder.subscriptionAlert(
                        "Your subscription expires in " + daysLeft + " day(s). Please renew soon."
                );
                builder.subscriptionAlertAr(
                        "اشتراكك ينتهي خلال " + daysLeft + " يوم/أيام. يرجى التجديد قريبًا."
                );
            }
        }

        return builder.build();
    }

    public UserDto me(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));
        return UserDto.from(user);
    }
}
