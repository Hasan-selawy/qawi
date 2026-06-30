package com.qawi.service;

import com.qawi.dto.NotificationCommand;
import com.qawi.entity.Notification;
import com.qawi.entity.NotificationCategory;
import com.qawi.entity.NotificationPreference;
import com.qawi.entity.NotificationPriority;
import com.qawi.entity.NotificationType;
import com.qawi.entity.User;
import com.qawi.exception.AppException;
import com.qawi.repository.NotificationRepository;
import com.qawi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

/**
 * Central entry point for creating and reading in-app notifications.
 *
 * <p>Every notification — legacy events, automatic jobs, scheduled broadcasts,
 * manual admin sends — funnels through {@link #dispatch(NotificationCommand)} so
 * the gym feature-flag gate, idempotency and (in a later milestone) preference
 * checks and push fan-out are applied consistently in one place.
 */
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final GymFeatureService gymFeatureService;
    private final DeliveryLogService deliveryLogService;
    private final NotificationPreferenceService preferenceService;
    private final WebPushService webPushService;
    private final ExpoPushService expoPushService;

    // ── Creation ──────────────────────────────────────────────────────────

    /**
     * Legacy entry point — preserved signature/behaviour for existing callers.
     * Creates an in-app notification gated on the recipient's gym
     * pushNotificationsEnabled flag; returns null when disabled.
     */
    public Notification create(UUID userId, NotificationType type, String message, String messageAr) {
        return dispatch(NotificationCommand.builder()
                .userId(userId)
                .type(type)
                .message(message)
                .messageAr(messageAr)
                .build());
    }

    /**
     * Canonical creation path. Returns the saved notification, or null when the
     * recipient is unknown, the gym feature is disabled, or the command was a
     * duplicate (idempotency key already delivered).
     */
    @Transactional
    public Notification dispatch(NotificationCommand cmd) {
        if (cmd.getUserId() == null) return null;

        User recipient = userRepository.findById(cmd.getUserId()).orElse(null);
        if (recipient == null) return null;

        UUID gymId = cmd.getGymId() != null ? cmd.getGymId() : recipient.getGymId();

        // Gym-level feature gate (preserves historical behaviour).
        if (!gymFeatureService.isEnabledForGymId(gymId, GymFeatureService.Feature.PUSH_NOTIFICATIONS)) {
            return null;
        }

        NotificationCategory category = cmd.getCategory() != null ? cmd.getCategory() : categoryFor(cmd.getType());

        // Per-user category opt-out. Defaults are all-on, so existing behaviour is unchanged.
        NotificationPreference pref = preferenceService.getOrCreate(cmd.getUserId());
        if (!preferenceService.categoryAllowed(pref, category)) {
            return null;
        }

        // Idempotency: automatic/scheduled callers pass a stable uniqueKey.
        if (cmd.getUniqueKey() != null && !cmd.getUniqueKey().isBlank()) {
            boolean reserved = deliveryLogService.reserve(cmd.getUniqueKey(), gymId, cmd.getUserId(), cmd.getType());
            if (!reserved) return null;
        }

        NotificationPriority priority = cmd.getPriority() != null ? cmd.getPriority() : NotificationPriority.NORMAL;

        Notification saved = null;
        if (pref.isInAppEnabled()) {
            saved = notificationRepository.save(Notification.builder()
                    .userId(cmd.getUserId())
                    .gymId(gymId)
                    .type(cmd.getType())
                    .titleEn(cmd.getTitleEn())
                    .titleAr(cmd.getTitleAr())
                    .message(cmd.getMessage())
                    .messageAr(cmd.getMessageAr())
                    .category(category)
                    .priority(priority)
                    .actionUrl(cmd.getActionUrl())
                    .uniqueKey(cmd.getUniqueKey())
                    .build());
        }

        // Best-effort push fan-out (web + mobile), after the in-app row commits.
        schedulePushFanOut(recipient.getId(), pref, cmd, category);
        return saved;
    }

    /**
     * Queues best-effort web + Expo push delivery for after the current
     * transaction commits (so we don't hold a DB connection open during the
     * outbound HTTP calls, and never push for a rolled-back notification).
     * Respects the user's per-channel toggles and quiet-hours window; push
     * services themselves are exception-safe no-ops when unconfigured.
     */
    private void schedulePushFanOut(UUID userId, NotificationPreference pref,
                                    NotificationCommand cmd, NotificationCategory category) {
        final boolean browser = pref.isBrowserPushEnabled();
        final boolean mobile = pref.isMobilePushEnabled();
        if (!browser && !mobile) return;
        if (preferenceService.inQuietHours(pref, LocalTime.now())) return;

        final String title = (cmd.getTitleEn() != null && !cmd.getTitleEn().isBlank())
                ? cmd.getTitleEn() : "Qawi";
        final String titleAr = cmd.getTitleAr();
        final String body = cmd.getMessage();
        final String bodyAr = cmd.getMessageAr();
        final String actionUrl = cmd.getActionUrl();
        final NotificationType type = cmd.getType();

        final Runnable task = () -> {
            if (browser) {
                try {
                    webPushService.sendToUser(userId, title, titleAr, body, bodyAr, actionUrl, type);
                } catch (Exception ignored) {
                    // best-effort
                }
            }
            if (mobile) {
                try {
                    expoPushService.sendToUser(userId, title, titleAr, body, bodyAr, actionUrl, type);
                } catch (Exception ignored) {
                    // best-effort
                }
            }
        };

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    task.run();
                }
            });
        } else {
            task.run();
        }
    }

    // ── Reads ─────────────────────────────────────────────────────────────

    public List<Notification> getForUser(UUID userId) {
        return notificationRepository.findByUserIdAndArchivedFalseOrderByCreatedAtDesc(userId);
    }

    public Page<Notification> getPage(UUID userId, boolean unreadOnly, NotificationCategory category, Pageable pageable) {
        if (category != null) {
            return notificationRepository
                    .findByUserIdAndArchivedFalseAndCategoryOrderByCreatedAtDesc(userId, category, pageable);
        }
        if (unreadOnly) {
            return notificationRepository
                    .findByUserIdAndArchivedFalseAndIsReadFalseOrderByCreatedAtDesc(userId, pageable);
        }
        return notificationRepository.findByUserIdAndArchivedFalseOrderByCreatedAtDesc(userId, pageable);
    }

    public long unreadCount(UUID userId) {
        return notificationRepository.countByUserIdAndArchivedFalseAndIsReadFalse(userId);
    }

    // ── Mutations ─────────────────────────────────────────────────────────

    @Transactional
    public Notification markRead(UUID notificationId, UUID callerUserId) {
        Notification n = loadOwned(notificationId, callerUserId);
        if (!n.isRead()) {
            n.setRead(true);
            n.setReadAt(LocalDateTime.now());
            n = notificationRepository.save(n);
        }
        return n;
    }

    @Transactional
    public void markAllRead(UUID userId) {
        notificationRepository.markAllReadByUserId(userId, LocalDateTime.now());
    }

    @Transactional
    public void archive(UUID notificationId, UUID callerUserId) {
        Notification n = loadOwned(notificationId, callerUserId);
        if (!n.isArchived()) {
            n.setArchived(true);
            notificationRepository.save(n);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private Notification loadOwned(UUID notificationId, UUID callerUserId) {
        Notification n = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new AppException(
                        "Notification not found", "الإشعار غير موجود", HttpStatus.NOT_FOUND));
        if (!n.getUserId().equals(callerUserId)) {
            throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);
        }
        return n;
    }

    /** Maps a fine-grained type to its category for filtering / preferences. */
    public static NotificationCategory categoryFor(NotificationType type) {
        if (type == null) return NotificationCategory.GENERAL;
        return switch (type) {
            case MISSED_DAYS, INACTIVE_MEMBER -> NotificationCategory.ATTENDANCE;
            case SUBSCRIPTION_ALERT, MEMBERSHIP_EXPIRING, MEMBERSHIP_EXPIRED,
                 RENEWAL_REMINDER, RENEWAL_REQUEST -> NotificationCategory.MEMBERSHIP;
            case DAY_COMPLETED -> NotificationCategory.WORKOUT;
            case MEASUREMENT_ADDED -> NotificationCategory.MEASUREMENT;
            case CLASS_REMINDER, CLASS_BOOKING_CONFIRMED, CLASS_CANCELLED -> NotificationCategory.CLASS;
            case NEW_MEMBER, COACH_ASSIGNED, REPORT_SUBMITTED, ADMIN_ALERT -> NotificationCategory.ADMIN_ALERT;
            case MANUAL_BROADCAST -> NotificationCategory.BROADCAST;
        };
    }
}
