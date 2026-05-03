package com.qawi.service;

import com.qawi.entity.Gym;
import com.qawi.entity.User;
import com.qawi.exception.AppException;
import com.qawi.repository.GymRepository;
import com.qawi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Resolves per-gym feature flags / limits / branding for any caller.
 * Endpoints and services use this to gate Pro features.
 */
@Service
@RequiredArgsConstructor
public class GymFeatureService {

    public enum Feature {
        NUTRITION, PUSH_NOTIFICATIONS, CUSTOM_BRANDING, CLASS_BOOKING, ANALYTICS_ADVANCED
    }

    private final UserRepository userRepository;
    private final GymRepository gymRepository;

    @Transactional(readOnly = true)
    public User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));
    }

    /** Returns the user's gym, or null for SUPER_ADMIN / unaffiliated users. */
    @Transactional(readOnly = true)
    public Gym getGymForUser(String email) {
        UUID gymId = getUser(email).getGymId();
        if (gymId == null) return null;
        return gymRepository.findById(gymId).orElse(null);
    }

    @Transactional(readOnly = true)
    public Gym getGym(UUID gymId) {
        return gymRepository.findById(gymId)
                .orElseThrow(() -> new AppException("Gym not found", "الصالة غير موجودة", HttpStatus.NOT_FOUND));
    }

    public boolean isEnabled(Gym gym, Feature feature) {
        if (gym == null) return true; // unaffiliated (e.g. super admin) — don't block
        return switch (feature) {
            case NUTRITION -> gym.isNutritionEnabled();
            case PUSH_NOTIFICATIONS -> gym.isPushNotificationsEnabled();
            case CUSTOM_BRANDING -> gym.isCustomBrandingEnabled();
            case CLASS_BOOKING -> gym.isClassBookingEnabled();
            case ANALYTICS_ADVANCED -> gym.isAnalyticsAdvancedEnabled();
        };
    }

    public boolean isEnabledForUser(String email, Feature feature) {
        return isEnabled(getGymForUser(email), feature);
    }

    public boolean isEnabledForGymId(UUID gymId, Feature feature) {
        if (gymId == null) return true;
        return gymRepository.findById(gymId).map(g -> isEnabled(g, feature)).orElse(true);
    }

    /** Throws 403 if the feature is off for the caller's gym. */
    public void assertEnabled(String email, Feature feature) {
        if (!isEnabledForUser(email, feature)) {
            throw new AppException(
                    "Feature not enabled for your gym",
                    "هذه الميزة غير مفعلة لصالتك",
                    HttpStatus.FORBIDDEN);
        }
    }

    /** Public-shape config for /me/gym-config (any authed caller). */
    public Map<String, Object> publicConfig(Gym gym) {
        Map<String, Object> features = new LinkedHashMap<>();
        Map<String, Object> branding = new LinkedHashMap<>();
        Map<String, Object> limits = new LinkedHashMap<>();

        boolean nutrition = gym == null || gym.isNutritionEnabled();
        boolean push = gym == null || gym.isPushNotificationsEnabled();
        boolean customBranding = gym != null && gym.isCustomBrandingEnabled();
        boolean classBooking = gym != null && gym.isClassBookingEnabled();
        boolean analyticsAdvanced = gym != null && gym.isAnalyticsAdvancedEnabled();

        features.put("nutritionEnabled", nutrition);
        features.put("pushNotificationsEnabled", push);
        features.put("customBrandingEnabled", customBranding);
        features.put("classBookingEnabled", classBooking);
        features.put("analyticsAdvancedEnabled", analyticsAdvanced);

        // Only surface branding overrides when the customer pays for the feature.
        branding.put("logoUrl", customBranding && gym != null ? gym.getLogoUrl() : null);
        branding.put("primaryColor", customBranding && gym != null ? gym.getPrimaryColor() : null);

        limits.put("maxMembers", gym == null ? null : gym.getMaxMembers());

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("gymId", gym == null ? null : gym.getId());
        out.put("gymName", gym == null ? null : gym.getName());
        out.put("features", features);
        out.put("branding", branding);
        out.put("limits", limits);
        return out;
    }
}
