package com.qawi.service;

import com.qawi.entity.Notification;
import com.qawi.entity.NotificationType;
import com.qawi.entity.User;
import com.qawi.repository.NotificationRepository;
import com.qawi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final GymFeatureService gymFeatureService;

    /**
     * Creates an in-app notification, gated on the recipient's gym
     * pushNotificationsEnabled flag. Returns null when the feature is disabled
     * for the recipient's gym so callers can no-op safely.
     */
    public Notification create(UUID userId, NotificationType type, String message, String messageAr) {
        User recipient = userRepository.findById(userId).orElse(null);
        if (recipient != null
                && !gymFeatureService.isEnabledForGymId(recipient.getGymId(), GymFeatureService.Feature.PUSH_NOTIFICATIONS)) {
            return null;
        }
        return notificationRepository.save(Notification.builder()
                .userId(userId)
                .type(type)
                .message(message)
                .messageAr(messageAr)
                .build());
    }

    public List<Notification> getForUser(UUID userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional
    public Notification markRead(UUID notificationId, UUID callerUserId) {
        Notification n = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new com.qawi.exception.AppException(
                        "Notification not found", "الإشعار غير موجود",
                        org.springframework.http.HttpStatus.NOT_FOUND));
        if (!n.getUserId().equals(callerUserId)) {
            throw new com.qawi.exception.AppException(
                    "Access denied", "غير مصرح لك",
                    org.springframework.http.HttpStatus.FORBIDDEN);
        }
        n.setRead(true);
        return notificationRepository.save(n);
    }

    @Transactional
    public void markAllRead(UUID userId) {
        notificationRepository.markAllReadByUserId(userId);
    }
}
