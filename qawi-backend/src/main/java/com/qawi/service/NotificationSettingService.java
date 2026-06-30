package com.qawi.service;

import com.qawi.dto.NotificationSettingRequest;
import com.qawi.entity.NotificationSetting;
import com.qawi.repository.NotificationSettingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Per-gym configuration that drives the automatic notification jobs. Rows are
 * created lazily with sensible defaults.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationSettingService {

    private final NotificationSettingRepository settingRepository;

    @Transactional
    public NotificationSetting getOrCreate(UUID gymId) {
        return settingRepository.findByGymId(gymId)
                .orElseGet(() -> settingRepository.save(NotificationSetting.builder().gymId(gymId).build()));
    }

    @Transactional
    public NotificationSetting update(UUID gymId, NotificationSettingRequest req) {
        NotificationSetting s = getOrCreate(gymId);

        if (req.getMembershipExpiryEnabled() != null) s.setMembershipExpiryEnabled(req.getMembershipExpiryEnabled());
        if (req.getExpiryReminderDays() != null) s.setExpiryReminderDays(req.getExpiryReminderDays());
        if (req.getExpiredAlertEnabled() != null) s.setExpiredAlertEnabled(req.getExpiredAlertEnabled());
        if (req.getInactiveMemberEnabled() != null) s.setInactiveMemberEnabled(req.getInactiveMemberEnabled());
        if (req.getInactiveAfterDays() != null) s.setInactiveAfterDays(req.getInactiveAfterDays());
        if (req.getClassReminderEnabled() != null) s.setClassReminderEnabled(req.getClassReminderEnabled());
        if (req.getClassReminderMinutesBefore() != null) s.setClassReminderMinutesBefore(req.getClassReminderMinutesBefore());
        if (req.getAdminAlertsEnabled() != null) s.setAdminAlertsEnabled(req.getAdminAlertsEnabled());

        s.setUpdatedAt(LocalDateTime.now());
        return settingRepository.save(s);
    }

    /** Parses the CSV reminder-days setting into a sorted, de-duplicated list. */
    public List<Integer> parseReminderDays(NotificationSetting setting) {
        List<Integer> days = new ArrayList<>();
        if (setting.getExpiryReminderDays() == null || setting.getExpiryReminderDays().isBlank()) {
            return days;
        }
        for (String part : setting.getExpiryReminderDays().split(",")) {
            try {
                int d = Integer.parseInt(part.trim());
                if (d >= 0 && !days.contains(d)) days.add(d);
            } catch (NumberFormatException e) {
                log.debug("Ignoring invalid reminder-day value '{}' for gym {}", part, setting.getGymId());
            }
        }
        return days;
    }
}
