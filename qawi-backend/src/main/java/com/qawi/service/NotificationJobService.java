package com.qawi.service;

import com.qawi.dto.NotificationCommand;
import com.qawi.entity.*;
import com.qawi.repository.AttendanceRepository;
import com.qawi.repository.ClassBookingRepository;
import com.qawi.repository.GymClassRepository;
import com.qawi.repository.GymRepository;
import com.qawi.repository.ScheduledNotificationRepository;
import com.qawi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Automatic, gym-scoped notification jobs. The whole bean (and therefore all of
 * its scheduled methods) is disabled when {@code qawi.notifications.jobs.enabled}
 * is set to {@code false}.
 *
 * <p>Every notification is sent through {@link NotificationService#dispatch} with
 * a stable {@code uniqueKey}, so re-runs, overlapping windows and restarts can
 * never produce duplicates.
 */
@Service
@ConditionalOnProperty(name = "qawi.notifications.jobs.enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
public class NotificationJobService {

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    private final GymRepository gymRepository;
    private final UserRepository userRepository;
    private final AttendanceRepository attendanceRepository;
    private final GymClassRepository gymClassRepository;
    private final ClassBookingRepository classBookingRepository;
    private final NotificationSettingService settingService;
    private final NotificationService notificationService;
    private final GymFeatureService gymFeatureService;
    private final ScheduledNotificationRepository scheduledRepository;
    private final AdminNotificationService adminNotificationService;

    // ── Membership expiry reminders (daily 08:00) ─────────────────────────

    @Scheduled(cron = "${qawi.notifications.jobs.expiry-cron:0 0 8 * * *}")
    public void runMembershipExpiryReminders() {
        LocalDate today = LocalDate.now();
        for (Gym gym : gymRepository.findAll()) {
            UUID gymId = gym.getId();
            NotificationSetting setting = settingService.getOrCreate(gymId);
            if (!setting.isMembershipExpiryEnabled()) continue;

            for (int day : settingService.parseReminderDays(setting)) {
                LocalDate target = today.plusDays(day);
                List<User> members = userRepository.findMembersWithExpiringSubscription(gymId, target, target);
                for (User member : members) {
                    LocalDate end = member.getSubscriptionEndDate();
                    String key = "membership_expiry:" + gymId + ":" + member.getId() + ":" + end + ":" + day + "days";
                    NotificationTemplates.Content c = NotificationTemplates.membershipExpiring(day);
                    safeDispatch(NotificationCommand.builder()
                            .userId(member.getId()).gymId(gymId)
                            .type(NotificationType.MEMBERSHIP_EXPIRING)
                            .category(NotificationCategory.MEMBERSHIP)
                            .priority(NotificationPriority.HIGH)
                            .titleEn(c.titleEn()).titleAr(c.titleAr())
                            .message(c.bodyEn()).messageAr(c.bodyAr())
                            .actionUrl("/member/renewal")
                            .uniqueKey(key)
                            .build());
                }
            }
        }
    }

    // ── Expired-membership alerts (daily 08:05) ───────────────────────────

    @Scheduled(cron = "${qawi.notifications.jobs.expired-cron:0 5 8 * * *}")
    public void runExpiredAlerts() {
        LocalDate today = LocalDate.now();
        for (Gym gym : gymRepository.findAll()) {
            UUID gymId = gym.getId();
            NotificationSetting setting = settingService.getOrCreate(gymId);
            if (!setting.isExpiredAlertEnabled()) continue;

            for (User member : userRepository.findExpiredMembers(gymId, SubscriptionStatusUtil.graceCutoff(today))) {
                LocalDate end = member.getSubscriptionEndDate();
                // Keyed by the expiry date so each membership period alerts exactly once.
                String key = "membership_expired:" + gymId + ":" + member.getId() + ":" + end;
                NotificationTemplates.Content c = NotificationTemplates.membershipExpired();
                safeDispatch(NotificationCommand.builder()
                        .userId(member.getId()).gymId(gymId)
                        .type(NotificationType.MEMBERSHIP_EXPIRED)
                        .category(NotificationCategory.MEMBERSHIP)
                        .priority(NotificationPriority.HIGH)
                        .titleEn(c.titleEn()).titleAr(c.titleAr())
                        .message(c.bodyEn()).messageAr(c.bodyAr())
                        .actionUrl("/member/renewal")
                        .uniqueKey(key)
                        .build());
            }
        }
    }

    // ── Inactive-member nudges + admin alerts (daily 09:00) ───────────────

    @Scheduled(cron = "${qawi.notifications.jobs.inactive-cron:0 0 9 * * *}")
    public void runInactiveMembers() {
        LocalDate today = LocalDate.now();
        for (Gym gym : gymRepository.findAll()) {
            UUID gymId = gym.getId();
            NotificationSetting setting = settingService.getOrCreate(gymId);
            if (!setting.isInactiveMemberEnabled()) continue;

            int threshold = Math.max(setting.getInactiveAfterDays(), 1);
            LocalDateTime since = LocalDateTime.now().minusDays(threshold);
            Set<UUID> recentlyActive = new HashSet<>(
                    attendanceRepository.findDistinctMemberIdsByGymIdAndCheckedInAtAfter(gymId, since));

            List<User> admins = setting.isAdminAlertsEnabled()
                    ? userRepository.findByGymIdAndRole(gymId, Role.GYM_ADMIN)
                    : List.of();

            for (User member : userRepository.findByGymIdAndRole(gymId, Role.MEMBER)) {
                if (!member.isActive() || recentlyActive.contains(member.getId())) continue;

                // Anchor the absence period to the last check-in (or join date) so each
                // distinct absence is notified exactly once, not every day the job runs.
                var last = attendanceRepository.findFirstByMemberIdOrderByCheckedInAtDesc(member.getId());
                LocalDate anchorDate;
                String anchorTag;
                if (last.isPresent()) {
                    anchorDate = last.get().getCheckedInAt().toLocalDate();
                    anchorTag = "c" + anchorDate;
                } else {
                    anchorDate = member.getCreatedAt() != null ? member.getCreatedAt().toLocalDate() : today;
                    anchorTag = "j" + anchorDate;
                }
                long daysInactive = ChronoUnit.DAYS.between(anchorDate, today);
                if (daysInactive < threshold) continue;

                String key = "inactive_member:" + gymId + ":" + member.getId() + ":" + threshold + ":" + anchorTag;
                NotificationTemplates.Content c = NotificationTemplates.inactiveMember((int) daysInactive);
                safeDispatch(NotificationCommand.builder()
                        .userId(member.getId()).gymId(gymId)
                        .type(NotificationType.INACTIVE_MEMBER)
                        .category(NotificationCategory.ATTENDANCE)
                        .priority(NotificationPriority.NORMAL)
                        .titleEn(c.titleEn()).titleAr(c.titleAr())
                        .message(c.bodyEn()).messageAr(c.bodyAr())
                        .actionUrl("/member/dashboard")
                        .uniqueKey(key)
                        .build());

                for (User admin : admins) {
                    String adminKey = "inactive_member_admin:" + gymId + ":" + member.getId()
                            + ":" + threshold + ":" + anchorTag + ":" + admin.getId();
                    NotificationTemplates.Content ac =
                            NotificationTemplates.adminInactiveAlert(member.getName(), (int) daysInactive);
                    safeDispatch(NotificationCommand.builder()
                            .userId(admin.getId()).gymId(gymId)
                            .type(NotificationType.ADMIN_ALERT)
                            .category(NotificationCategory.ADMIN_ALERT)
                            .priority(NotificationPriority.NORMAL)
                            .titleEn(ac.titleEn()).titleAr(ac.titleAr())
                            .message(ac.bodyEn()).messageAr(ac.bodyAr())
                            .actionUrl("/admin/members")
                            .uniqueKey(adminKey)
                            .build());
                }
            }
        }
    }

    // ── Class reminders (every 15 minutes) ────────────────────────────────

    @Scheduled(cron = "${qawi.notifications.jobs.class-reminder-cron:0 0/15 * * * *}")
    public void runClassReminders() {
        LocalDateTime now = LocalDateTime.now();
        for (Gym gym : gymRepository.findAll()) {
            UUID gymId = gym.getId();
            NotificationSetting setting = settingService.getOrCreate(gymId);
            if (!setting.isClassReminderEnabled()) continue;
            if (!gymFeatureService.isEnabled(gym, GymFeatureService.Feature.CLASS_BOOKING)) continue;

            int minutesBefore = setting.getClassReminderMinutesBefore();
            LocalDateTime windowEnd = now.plusMinutes(minutesBefore);

            List<GymClass> upcoming = gymClassRepository
                    .findByGymIdAndStatusAndDateTimeAfterOrderByDateTimeAsc(gymId, GymClassStatus.ACTIVE, now);
            for (GymClass cls : upcoming) {
                if (cls.getDateTime().isAfter(windowEnd)) break; // ordered asc — nothing further is in-window
                String time = cls.getDateTime().format(TIME_FMT);
                NotificationTemplates.Content c = NotificationTemplates.classReminder(cls.getName(), time);
                for (ClassBooking booking :
                        classBookingRepository.findByClassIdAndStatus(cls.getId(), ClassBookingStatus.BOOKED)) {
                    String key = "class_reminder:" + gymId + ":" + booking.getId() + ":" + minutesBefore;
                    safeDispatch(NotificationCommand.builder()
                            .userId(booking.getMemberId()).gymId(gymId)
                            .type(NotificationType.CLASS_REMINDER)
                            .category(NotificationCategory.CLASS)
                            .priority(NotificationPriority.HIGH)
                            .titleEn(c.titleEn()).titleAr(c.titleAr())
                            .message(c.bodyEn()).messageAr(c.bodyAr())
                            .actionUrl("/member/classes")
                            .uniqueKey(key)
                            .build());
                }
            }
        }
    }

    // ── Scheduled-broadcast flush (every minute) ──────────────────────────

    @Scheduled(cron = "${qawi.notifications.jobs.flush-cron:0 * * * * *}")
    public void flushScheduledBroadcasts() {
        List<ScheduledNotification> due = scheduledRepository
                .findByStatusAndScheduledAtBefore(ScheduledNotificationStatus.PENDING, LocalDateTime.now());
        for (ScheduledNotification sn : due) {
            try {
                int delivered = adminNotificationService.deliver(
                        sn.getGymId(), sn.getTitleEn(), sn.getTitleAr(), sn.getBodyEn(), sn.getBodyAr(),
                        sn.getAudience(), sn.getTargetUserId(), sn.getCategory(), sn.getPriority(),
                        sn.getActionUrl(), "scheduled_broadcast:" + sn.getId());
                sn.setStatus(ScheduledNotificationStatus.SENT);
                sn.setSentAt(LocalDateTime.now());
                sn.setRecipientCount(delivered);
            } catch (Exception e) {
                log.error("Failed to flush scheduled notification {}", sn.getId(), e);
                sn.setStatus(ScheduledNotificationStatus.FAILED);
            }
            sn.setUpdatedAt(LocalDateTime.now());
            scheduledRepository.save(sn);
        }
    }

    /** Dispatch that never lets one bad recipient abort the rest of a job run. */
    private void safeDispatch(NotificationCommand cmd) {
        try {
            notificationService.dispatch(cmd);
        } catch (Exception e) {
            log.warn("Notification dispatch failed for user {}: {}", cmd.getUserId(), e.getMessage());
        }
    }
}
