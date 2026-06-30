package com.qawi.service;

import com.qawi.dto.NotificationCommand;
import com.qawi.dto.ScheduleNotificationRequest;
import com.qawi.dto.SendNotificationRequest;
import com.qawi.entity.*;
import com.qawi.exception.AppException;
import com.qawi.repository.ScheduledNotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Admin-facing notification operations: immediate broadcasts, scheduling, and
 * scheduled-broadcast delivery. All operations are scoped to the caller's gym.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdminNotificationService {

    private final GymFeatureService gymFeatureService;
    private final NotificationAudienceService audienceService;
    private final NotificationService notificationService;
    private final ScheduledNotificationRepository scheduledRepository;

    // ── Immediate broadcast ───────────────────────────────────────────────

    @Transactional
    public int send(String callerEmail, SendNotificationRequest req) {
        User caller = gymFeatureService.getUser(callerEmail);
        UUID gymId = requireGym(caller);
        return deliver(gymId, req.getTitleEn(), req.getTitleAr(), req.getBodyEn(), req.getBodyAr(),
                req.getAudience(), req.getTargetUserId(), req.getCategory(), req.getPriority(),
                req.getActionUrl(), null);
    }

    // ── Scheduling ────────────────────────────────────────────────────────

    @Transactional
    public ScheduledNotification schedule(String callerEmail, ScheduleNotificationRequest req) {
        User caller = gymFeatureService.getUser(callerEmail);
        UUID gymId = requireGym(caller);

        // Validate the audience/target now so bad requests fail fast (not at flush time).
        if (req.getAudience() == AudienceSegment.SPECIFIC_MEMBER) {
            audienceService.resolve(gymId, req.getAudience(), req.getTargetUserId());
        }

        return scheduledRepository.save(ScheduledNotification.builder()
                .gymId(gymId)
                .createdByUserId(caller.getId())
                .titleEn(req.getTitleEn())
                .titleAr(req.getTitleAr())
                .bodyEn(req.getBodyEn())
                .bodyAr(req.getBodyAr())
                .audience(req.getAudience())
                .targetUserId(req.getTargetUserId())
                .category(req.getCategory())
                .priority(req.getPriority())
                .actionUrl(req.getActionUrl())
                .scheduledAt(req.getScheduledAt())
                .status(ScheduledNotificationStatus.PENDING)
                .build());
    }

    @Transactional(readOnly = true)
    public List<ScheduledNotification> listScheduled(String callerEmail) {
        UUID gymId = requireGym(gymFeatureService.getUser(callerEmail));
        return scheduledRepository.findByGymIdOrderByScheduledAtDesc(gymId);
    }

    @Transactional
    public void cancelScheduled(String callerEmail, UUID id) {
        UUID gymId = requireGym(gymFeatureService.getUser(callerEmail));
        ScheduledNotification sn = scheduledRepository.findById(id)
                .orElseThrow(() -> new AppException("Scheduled notification not found",
                        "الإشعار المجدول غير موجود", HttpStatus.NOT_FOUND));
        if (!sn.getGymId().equals(gymId)) {
            throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);
        }
        if (sn.getStatus() != ScheduledNotificationStatus.PENDING) {
            throw new AppException("Only pending notifications can be cancelled",
                    "يمكن إلغاء الإشعارات المعلقة فقط", HttpStatus.CONFLICT);
        }
        sn.setStatus(ScheduledNotificationStatus.CANCELLED);
        sn.setUpdatedAt(LocalDateTime.now());
        scheduledRepository.save(sn);
    }

    @Transactional(readOnly = true)
    public int audienceCount(String callerEmail, AudienceSegment audience, UUID targetUserId) {
        UUID gymId = requireGym(gymFeatureService.getUser(callerEmail));
        return audienceService.count(gymId, audience, targetUserId);
    }

    /**
     * Delivers a (manual or scheduled) broadcast to its audience. When a
     * {@code uniqueKeyPrefix} is supplied, each per-recipient notification is
     * made idempotent (used by the scheduled flush so a re-run can't duplicate).
     */
    @Transactional
    public int deliver(UUID gymId, String titleEn, String titleAr, String bodyEn, String bodyAr,
                       AudienceSegment audience, UUID targetUserId, NotificationCategory category,
                       NotificationPriority priority, String actionUrl, String uniqueKeyPrefix) {
        NotificationCategory cat = category != null ? category : NotificationCategory.BROADCAST;
        NotificationPriority pri = priority != null ? priority : NotificationPriority.NORMAL;

        List<User> recipients = audienceService.resolve(gymId, audience, targetUserId);
        int delivered = 0;
        for (User recipient : recipients) {
            NotificationCommand.NotificationCommandBuilder cmd = NotificationCommand.builder()
                    .userId(recipient.getId())
                    .gymId(gymId)
                    .type(NotificationType.MANUAL_BROADCAST)
                    .category(cat)
                    .priority(pri)
                    .titleEn(titleEn)
                    .titleAr(titleAr)
                    .message(bodyEn)
                    .messageAr(bodyAr)
                    .actionUrl(actionUrl);
            if (uniqueKeyPrefix != null) {
                cmd.uniqueKey(uniqueKeyPrefix + ":" + recipient.getId());
            }
            if (notificationService.dispatch(cmd.build()) != null) {
                delivered++;
            }
        }
        return delivered;
    }

    private UUID requireGym(User caller) {
        if (caller.getGymId() == null) {
            throw new AppException("Your account is not associated with a gym",
                    "حسابك غير مرتبط بصالة", HttpStatus.BAD_REQUEST);
        }
        return caller.getGymId();
    }
}
