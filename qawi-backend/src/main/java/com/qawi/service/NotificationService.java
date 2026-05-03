package com.qawi.service;

import com.qawi.entity.Notification;
import com.qawi.entity.NotificationType;
import com.qawi.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public Notification create(UUID userId, NotificationType type, String message, String messageAr) {
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
