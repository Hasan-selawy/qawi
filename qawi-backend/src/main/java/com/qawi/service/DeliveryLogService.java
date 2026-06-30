package com.qawi.service;

import com.qawi.entity.NotificationDeliveryLog;
import com.qawi.entity.NotificationType;
import com.qawi.repository.NotificationDeliveryLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Owns idempotency reservations for automatic / scheduled notifications.
 *
 * <p>Lives in its own bean so {@link Transactional} with REQUIRES_NEW actually
 * opens a fresh transaction (self-invocation would bypass the proxy). The insert
 * is committed independently and a unique-constraint violation is treated as
 * "already delivered" — so a job that runs twice cannot double-notify.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DeliveryLogService {

    private final NotificationDeliveryLogRepository deliveryLogRepository;

    /**
     * Reserve a delivery key. Returns {@code true} when this caller won the race
     * (and should proceed to create the notification), {@code false} when the key
     * was already taken (duplicate — skip).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean reserve(String uniqueKey, UUID gymId, UUID userId, NotificationType type) {
        if (deliveryLogRepository.existsByUniqueKey(uniqueKey)) {
            return false;
        }
        try {
            deliveryLogRepository.saveAndFlush(NotificationDeliveryLog.builder()
                    .uniqueKey(uniqueKey)
                    .gymId(gymId)
                    .userId(userId)
                    .type(type)
                    .build());
            return true;
        } catch (DataIntegrityViolationException e) {
            // Lost the race against a concurrent insert — already delivered.
            log.debug("Delivery key already reserved: {}", uniqueKey);
            return false;
        }
    }
}
