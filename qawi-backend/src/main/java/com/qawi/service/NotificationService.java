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
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Central entry point for creating and reading in-app notifications.
 *
 * <p>Every notification — legacy events, automatic jobs, scheduled broadcasts,
 * manual admin sends — funnels through {@link #dispatch(NotificationCommand)} so
 * the gym feature-flag gate, per-gym automatic settings, per-user preferences,
 * idempotency and push fan-out are applied consistently in one place.
 */
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final GymFeatureService gymFeatureService;
    private final DeliveryLogService deliveryLogService;
    private final NotificationPreferenceService preferenceService;
    private final NotificationSettingService notificationSettingService;
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
     * recipient is unknown, the gym feature is disabled, the gym has muted this
     * automatic category, the user opted out, or the command was a duplicate
     * (idempotency key already delivered).
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

        // Per-gym automatic-settings gate: admin-alert notifications respect the
        // gym's adminAlertsEnabled toggle. Applies uniformly to in-process events
        // (new member, coach assignment, report/suggestion, renewal request) and to
        // job-driven admin alerts. Skipped for platform-level (null-gym) recipients.
        if (category == NotificationCategory.ADMIN_ALERT && gymId != null
                && !notificationSettingService.adminAlertsEnabled(gymId)) {
            return null;
        }

        // Per-user category opt-out. Defaults are all-on, so existing behaviour is unchanged.
        NotificationPreference pref = preferenceService.getOrCreate(cmd.getUserId());
        if (!preferenceService.categoryAllowed(pref, category)) {
            return null;
        }

        // Idempotency: automatic/scheduled/in-process callers pass a stable uniqueKey.
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

    /**
     * Sends a one-off test push to the caller across whichever push channels they
     * have enabled, respecting the gym push feature flag and the user's per-channel
     * preferences. Does not create an in-app row or consume an idempotency key.
     * Returns a small map describing what was attempted so the client can report it.
     */
    public Map<String, Boolean> sendTestPush(User caller) {
        Map<String, Boolean> result = new LinkedHashMap<>();
        result.put("featureEnabled", false);
        result.put("browser", false);
        result.put("mobile", false);

        if (!gymFeatureService.isEnabledForGymId(caller.getGymId(), GymFeatureService.Feature.PUSH_NOTIFICATIONS)) {
            return result;
        }
        result.put("featureEnabled", true);

        NotificationPreference pref = preferenceService.getOrCreate(caller.getId());
        final String titleEn = "Test notification";
        final String titleAr = "إشعار تجريبي";
        final String bodyEn = "Your push notifications are working.";
        final String bodyAr = "إشعارات الدفع لديك تعمل.";

        if (pref.isBrowserPushEnabled()) {
            try {
                webPushService.sendToUser(caller.getId(), titleEn, titleAr, bodyEn, bodyAr,
                        "/notifications", NotificationType.ADMIN_ALERT);
                result.put("browser", true);
            } catch (Exception ignored) {
                // best-effort
            }
        }
        if (pref.isMobilePushEnabled()) {
            try {
                expoPushService.sendToUser(caller.getId(), titleEn, titleAr, bodyEn, bodyAr,
                        "/notifications", NotificationType.ADMIN_ALERT);
                result.put("mobile", true);
            } catch (Exception ignored) {
                // best-effort
            }
        }
        return result;
    }

    // ── Reads ─────────────────────────────────────────────────────────────

    public List<Notification> getForUser(User caller) {
        if (caller.getGymId() == null) {
            return notificationRepository.findByUserIdAndArchivedFalseOrderByCreatedAtDesc(caller.getId());
        }
        return notificationRepository.findOwnedFeed(caller.getId(), caller.getGymId());
    }

    /**
     * Paginated + filterable feed. Tenant-scoped by both userId and the caller's
     * gym (legacy rows predate the gymId column and carry null — kept visible to
     * their owner). Optional unread-only, category and type filters.
     */
    public Page<Notification> getPage(User caller, boolean unreadOnly, NotificationCategory category,
                                      NotificationType type, Pageable pageable) {
        final UUID userId = caller.getId();
        final UUID gymId = caller.getGymId();
        Specification<Notification> spec = (root, query, cb) -> {
            List<Predicate> preds = new ArrayList<>();
            preds.add(cb.equal(root.get("userId"), userId));
            preds.add(cb.isFalse(root.get("archived")));
            // Tenant guard: a recipient only ever sees their own gym's rows.
            if (gymId != null) {
                preds.add(cb.or(cb.isNull(root.get("gymId")), cb.equal(root.get("gymId"), gymId)));
            } else {
                preds.add(cb.isNull(root.get("gymId")));
            }
            if (category != null) preds.add(cb.equal(root.get("category"), category));
            if (type != null) preds.add(cb.equal(root.get("type"), type));
            if (unreadOnly) preds.add(cb.isFalse(root.get("isRead")));
            return cb.and(preds.toArray(new Predicate[0]));
        };
        return notificationRepository.findAll(spec, pageable);
    }

    public long unreadCount(User caller) {
        if (caller.getGymId() == null) {
            return notificationRepository.countByUserIdAndArchivedFalseAndIsReadFalse(caller.getId());
        }
        return notificationRepository.countOwnedUnread(caller.getId(), caller.getGymId());
    }

    // ── Mutations ─────────────────────────────────────────────────────────

    @Transactional
    public Notification markRead(UUID notificationId, User caller) {
        Notification n = loadOwned(notificationId, caller);
        if (!n.isRead()) {
            n.setRead(true);
            n.setReadAt(LocalDateTime.now());
            n = notificationRepository.save(n);
        }
        return n;
    }

    @Transactional
    public void markAllRead(User caller) {
        // Tenant-scoped bulk update: only the caller's own rows in their gym
        // (legacy null-gym rows included). Null-gym callers touch their null-gym rows.
        if (caller.getGymId() == null) {
            notificationRepository.markAllReadByUserId(caller.getId(), LocalDateTime.now());
        } else {
            notificationRepository.markAllReadByUserIdAndGym(
                    caller.getId(), caller.getGymId(), LocalDateTime.now());
        }
    }

    @Transactional
    public void archive(UUID notificationId, User caller) {
        Notification n = loadOwned(notificationId, caller);
        if (!n.isArchived()) {
            n.setArchived(true);
            notificationRepository.save(n);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private Notification loadOwned(UUID notificationId, User caller) {
        Notification n = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new AppException(
                        "Notification not found", "الإشعار غير موجود", HttpStatus.NOT_FOUND));
        // Ownership (userId) already binds a notification to a single user — hence a
        // single gym. The explicit gym check is defence-in-depth and tolerates
        // legacy rows whose gymId predates the column (null).
        boolean sameUser = n.getUserId().equals(caller.getId());
        boolean sameGym = n.getGymId() == null || caller.getGymId() == null
                || n.getGymId().equals(caller.getGymId());
        if (!sameUser || !sameGym) {
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
