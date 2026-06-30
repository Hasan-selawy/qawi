package com.qawi.event;

import com.qawi.dto.NotificationCommand;
import com.qawi.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Dispatches event-driven notifications after the originating transaction
 * commits. {@code fallbackExecution = true} ensures events published outside a
 * transaction are still handled.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationEventListener {

    private final NotificationService notificationService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onNotificationDispatch(NotificationDispatchEvent event) {
        if (event.commands() == null) return;
        for (NotificationCommand cmd : event.commands()) {
            try {
                notificationService.dispatch(cmd);
            } catch (Exception e) {
                log.warn("Event notification dispatch failed for user {}: {}", cmd.getUserId(), e.getMessage());
            }
        }
    }
}
