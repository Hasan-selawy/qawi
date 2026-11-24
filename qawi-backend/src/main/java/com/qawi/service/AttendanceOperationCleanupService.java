package com.qawi.service;

import com.qawi.repository.AttendanceOperationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;

/** Technical replay records expire only after their requests can no longer be accepted. Attendance is preserved. */
@Service @RequiredArgsConstructor
public class AttendanceOperationCleanupService {
    private final AttendanceOperationRepository operations;
    @Value("${qawi.attendance.max-offline-days:7}") private int maxOfflineDays;

    @Scheduled(cron = "0 30 3 * * *")
    @Transactional
    public void sweep() {
        operations.deleteByCreatedAtBefore(LocalDateTime.now().minusDays((long) maxOfflineDays + 2));
    }
}
