package com.qawi.repository;

import com.qawi.entity.ScheduledNotification;
import com.qawi.entity.ScheduledNotificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface ScheduledNotificationRepository extends JpaRepository<ScheduledNotification, UUID> {
    List<ScheduledNotification> findByGymIdOrderByScheduledAtDesc(UUID gymId);
    List<ScheduledNotification> findByStatusAndScheduledAtBefore(ScheduledNotificationStatus status, LocalDateTime before);
}
