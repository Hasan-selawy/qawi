package com.qawi.repository;

import com.qawi.entity.Notification;
import com.qawi.entity.NotificationCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface NotificationRepository
        extends JpaRepository<Notification, UUID>, JpaSpecificationExecutor<Notification> {

    /** Full non-archived feed for a user, newest first. */
    List<Notification> findByUserIdAndArchivedFalseOrderByCreatedAtDesc(UUID userId);

    /** Tenant-scoped feed: own rows in the caller's gym (legacy null-gym rows kept). */
    @Query("SELECT n FROM Notification n WHERE n.userId = :userId AND n.archived = false " +
            "AND (n.gymId IS NULL OR n.gymId = :gymId) ORDER BY n.createdAt DESC")
    List<Notification> findOwnedFeed(@Param("userId") UUID userId, @Param("gymId") UUID gymId);

    // ── Paginated / filtered ──────────────────────────────────────────────
    Page<Notification> findByUserIdAndArchivedFalseOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    Page<Notification> findByUserIdAndArchivedFalseAndIsReadFalseOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    Page<Notification> findByUserIdAndArchivedFalseAndCategoryOrderByCreatedAtDesc(
            UUID userId, NotificationCategory category, Pageable pageable);

    long countByUserIdAndArchivedFalseAndIsReadFalse(UUID userId);

    /** Tenant-scoped unread count: own rows in the caller's gym (legacy null-gym rows kept). */
    @Query("SELECT COUNT(n) FROM Notification n WHERE n.userId = :userId AND n.archived = false " +
            "AND n.isRead = false AND (n.gymId IS NULL OR n.gymId = :gymId)")
    long countOwnedUnread(@Param("userId") UUID userId, @Param("gymId") UUID gymId);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true, n.readAt = :now " +
            "WHERE n.userId = :userId AND n.isRead = false AND n.archived = false")
    int markAllReadByUserId(UUID userId, LocalDateTime now);

    /** Tenant-scoped variant: marks the caller's own rows in their gym (legacy null-gym rows included). */
    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true, n.readAt = :now " +
            "WHERE n.userId = :userId AND n.isRead = false AND n.archived = false " +
            "AND (n.gymId IS NULL OR n.gymId = :gymId)")
    int markAllReadByUserIdAndGym(@Param("userId") UUID userId, @Param("gymId") UUID gymId,
                                  @Param("now") LocalDateTime now);
}
