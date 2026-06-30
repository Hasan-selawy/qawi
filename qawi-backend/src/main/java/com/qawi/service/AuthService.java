package com.qawi.service;

import com.qawi.dto.AuthResponse;
import com.qawi.dto.ChangePasswordRequest;
import com.qawi.dto.LoginRequest;
import com.qawi.dto.RegisterRequest;
import com.qawi.dto.UserDto;
import com.qawi.entity.Role;
import com.qawi.entity.User;
import com.qawi.exception.AppException;
import com.qawi.repository.UserRepository;
import com.qawi.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
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
    private final LoginAttemptService loginAttemptService;
    private final RefreshTokenService refreshTokenService;

    public AuthResponse register(RegisterRequest req) {
        req.setEmail(req.getEmail().toLowerCase().trim());
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new AppException(
                    "Email already in use",
                    "البريد الإلكتروني مستخدم بالفعل",
                    HttpStatus.CONFLICT
            );
        }

        // Self-registration is restricted to MEMBER. Coach/Admin accounts are
        // only created by a GYM_ADMIN through /api/v1/admin/* endpoints, which
        // also assign the gymId. New self-registered members have no gym until
        // an admin associates them.
        User user = User.builder()
                .name(req.getName())
                .email(req.getEmail())
                .password(passwordEncoder.encode(req.getPassword()))
                .role(Role.MEMBER)
                .gymId(null)
                .build();

        userRepository.save(user);

        String token = jwtService.generateToken(user);
        return AuthResponse.builder()
                .token(token)
                .refreshToken(refreshTokenService.issue(user.getId()))
                .user(UserDto.from(user))
                .build();
    }

    public AuthResponse login(LoginRequest req) {
        String email = req.getEmail().toLowerCase().trim();

        // Brute-force protection: once an account has accumulated too many recent
        // consecutive failures it is locked for a cooldown window. Checked before
        // any credential work so a locked account cannot keep guessing.
        if (loginAttemptService.isLocked(email)) {
            long minutes = Math.max(loginAttemptService.secondsUntilUnlock(email) / 60 + 1, 1);
            throw new AppException(
                    "Too many failed login attempts. Please try again in " + minutes + " minute(s).",
                    "محاولات تسجيل دخول فاشلة كثيرة. يرجى المحاولة مرة أخرى بعد " + minutes + " دقيقة/دقائق.",
                    HttpStatus.TOO_MANY_REQUESTS
            );
        }

        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            // Unknown email is recorded as a failure (same generic 401) so the
            // lockout also defends against username enumeration / spraying.
            loginAttemptService.recordFailure(email);
            throw new AppException(
                    "Invalid email or password",
                    "البريد الإلكتروني أو كلمة المرور غير صحيحة",
                    HttpStatus.UNAUTHORIZED
            );
        }

        // Block login only when the member is locked out — i.e. the subscription
        // ended more than the grace period ago. Members still within the grace
        // window keep full access and may log in. This is NOT a credential
        // failure, so it never contributes to the brute-force lockout counter.
        if (SubscriptionStatusUtil.isLockedForAccess(user, LocalDate.now())) {
            throw new AppException(
                    "Your subscription has expired. Please renew to access the gym.",
                    "انتهت صلاحية اشتراكك. يرجى التجديد للوصول إلى الصالة.",
                    HttpStatus.FORBIDDEN
            );
        }

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, req.getPassword())
            );
        } catch (AuthenticationException ex) {
            loginAttemptService.recordFailure(email);
            throw new AppException(
                    "Invalid email or password",
                    "البريد الإلكتروني أو كلمة المرور غير صحيحة",
                    HttpStatus.UNAUTHORIZED
            );
        }

        loginAttemptService.recordSuccess(email);

        String token = jwtService.generateToken(user);

        AuthResponse.AuthResponseBuilder builder = AuthResponse.builder()
                .token(token)
                .refreshToken(refreshTokenService.issue(user.getId()))
                .user(UserDto.from(user));

        // Subscription alert: warn when expiring soon, or when in the post-expiry
        // grace window (already expired but still accessible for a few more days).
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
            } else if (daysLeft < 0) {
                long graceLeft = Math.max(SubscriptionStatusUtil.GRACE_PERIOD_DAYS + daysLeft, 0);
                builder.subscriptionAlert(
                        "Your subscription has expired. You have " + graceLeft
                                + " day(s) of grace access left — please renew now."
                );
                builder.subscriptionAlertAr(
                        "انتهى اشتراكك. متبقٍ لك " + graceLeft
                                + " يوم/أيام من فترة السماح — يرجى التجديد الآن."
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

    public void changePassword(String email, ChangePasswordRequest req) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));

        if (!passwordEncoder.matches(req.getCurrentPassword(), user.getPassword())) {
            throw new AppException(
                    "Current password is incorrect",
                    "كلمة المرور الحالية غير صحيحة",
                    HttpStatus.BAD_REQUEST
            );
        }

        user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        userRepository.save(user);
    }

    /**
     * Exchange a valid refresh token for a new access token. The presented
     * refresh token is rotated (revoked and replaced) so a leaked token has a
     * limited replay window.
     */
    public AuthResponse refresh(String refreshToken) {
        RefreshTokenService.Rotation rotation = refreshTokenService.rotate(refreshToken);
        User user = userRepository.findById(rotation.userId())
                .orElseThrow(() -> new AppException(
                        "Invalid or expired refresh token",
                        "رمز التحديث غير صالح أو منتهي الصلاحية",
                        HttpStatus.UNAUTHORIZED));
        String token = jwtService.generateToken(user);
        return AuthResponse.builder()
                .token(token)
                .refreshToken(rotation.rawToken())
                .user(UserDto.from(user))
                .build();
    }

    /** Revoke a refresh token (logout). Idempotent — unknown tokens are ignored. */
    public void logout(String refreshToken) {
        refreshTokenService.revoke(refreshToken);
    }
}
