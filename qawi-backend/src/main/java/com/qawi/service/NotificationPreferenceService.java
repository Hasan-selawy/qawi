package com.qawi.service;

import com.qawi.dto.NotificationPreferenceRequest;
import com.qawi.entity.NotificationCategory;
import com.qawi.entity.NotificationPreference;
import com.qawi.entity.User;
import com.qawi.repository.NotificationPreferenceRepository;
import com.qawi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

/**
 * Per-user notification preferences. Rows are created lazily with all-true
 * defaults, so existing users behave exactly as before until they opt out.
 */
@Service
@RequiredArgsConstructor
public class NotificationPreferenceService {

    private final NotificationPreferenceRepository preferenceRepository;
    private final UserRepository userRepository;

    @Transactional
    public NotificationPreference getOrCreate(UUID userId) {
        return preferenceRepository.findByUserId(userId).orElseGet(() -> {
            User user = userRepository.findById(userId).orElse(null);
            return preferenceRepository.save(NotificationPreference.builder()
                    .userId(userId)
                    .gymId(user != null ? user.getGymId() : null)
                    .build());
        });
    }

    @Transactional
    public NotificationPreference update(UUID userId, NotificationPreferenceRequest req) {
        NotificationPreference p = getOrCreate(userId);

        if (req.getInAppEnabled() != null) p.setInAppEnabled(req.getInAppEnabled());
        if (req.getBrowserPushEnabled() != null) p.setBrowserPushEnabled(req.getBrowserPushEnabled());
        if (req.getMobilePushEnabled() != null) p.setMobilePushEnabled(req.getMobilePushEnabled());

        if (req.getMembershipEnabled() != null) p.setMembershipEnabled(req.getMembershipEnabled());
        if (req.getAttendanceEnabled() != null) p.setAttendanceEnabled(req.getAttendanceEnabled());
        if (req.getClassEnabled() != null) p.setClassEnabled(req.getClassEnabled());
        if (req.getWorkoutEnabled() != null) p.setWorkoutEnabled(req.getWorkoutEnabled());
        if (req.getNutritionEnabled() != null) p.setNutritionEnabled(req.getNutritionEnabled());
        if (req.getAdminAlertsEnabled() != null) p.setAdminAlertsEnabled(req.getAdminAlertsEnabled());
        if (req.getBroadcastEnabled() != null) p.setBroadcastEnabled(req.getBroadcastEnabled());

        if (req.getPreferredLanguage() != null) p.setPreferredLanguage(req.getPreferredLanguage());
        // Quiet hours can be cleared by sending an explicit empty window via update endpoint.
        p.setQuietHoursStart(req.getQuietHoursStart());
        p.setQuietHoursEnd(req.getQuietHoursEnd());

        p.setUpdatedAt(LocalDateTime.now());
        return preferenceRepository.save(p);
    }

    /** True when the user has not opted out of the notification's category. */
    public boolean categoryAllowed(NotificationPreference p, NotificationCategory category) {
        if (category == null) return true;
        return switch (category) {
            case MEMBERSHIP -> p.isMembershipEnabled();
            case ATTENDANCE -> p.isAttendanceEnabled();
            case CLASS -> p.isClassEnabled();
            case WORKOUT -> p.isWorkoutEnabled();
            case NUTRITION -> p.isNutritionEnabled();
            case ADMIN_ALERT -> p.isAdminAlertsEnabled();
            case BROADCAST -> p.isBroadcastEnabled();
            case MEASUREMENT, GENERAL -> true;
        };
    }

    /** True when a push should be suppressed because we're inside the user's quiet window. */
    public boolean inQuietHours(NotificationPreference p, LocalTime now) {
        LocalTime start = p.getQuietHoursStart();
        LocalTime end = p.getQuietHoursEnd();
        if (start == null || end == null || start.equals(end)) return false;
        if (start.isBefore(end)) {
            // Same-day window, e.g. 13:00–15:00.
            return !now.isBefore(start) && now.isBefore(end);
        }
        // Overnight window, e.g. 22:00–07:00.
        return !now.isBefore(start) || now.isBefore(end);
    }
}
