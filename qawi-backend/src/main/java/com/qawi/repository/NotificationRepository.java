package com.qawi.repository;

import com.qawi.entity.Notification;
import com.qawi.entity.NotificationCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    /** Full non-archived feed for a user, newest first. */
    List<Notification> findByUserIdAndArchivedFalseOrderByCreatedAtDesc(UUID userId);

    // ── Paginated / filtered ──────────────────────────────────────────────
    Page<Notification> findByUserIdAndArchivedFalseOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    Page<Notification> findByUserIdAndArchivedFalseAndIsReadFalseOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    Page<Notification> findByUserIdAndArchivedFalseAndCategoryOrderByCreatedAtDesc(
            UUID userId, NotificationCategory category, Pageable pageable);

    long countByUserIdAndArchivedFalseAndIsReadFalse(UUID userId);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true, n.readAt = :now " +
            "WHERE n.userId = :userId AND n.isRead = false AND n.archived = false")
    int markAllReadByUserId(UUID userId, LocalDateTime now);
}
