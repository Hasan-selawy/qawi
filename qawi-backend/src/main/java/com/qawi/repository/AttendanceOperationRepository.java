package com.qawi.repository;
import com.qawi.entity.AttendanceOperation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface AttendanceOperationRepository extends JpaRepository<AttendanceOperation, UUID> {
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("delete from AttendanceOperation operation where operation.createdAt < :cutoff")
    int deleteByCreatedAtBefore(java.time.LocalDateTime cutoff);
    Optional<AttendanceOperation> findByMemberIdAndIdempotencyKey(UUID memberId, UUID idempotencyKey);
}
