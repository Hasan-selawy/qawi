package com.qawi.service;

import com.qawi.dto.CheckInResponse;
import com.qawi.dto.StreakResponse;
import com.qawi.entity.*;
import com.qawi.exception.AppException;
import com.qawi.repository.AttendanceRepository;
import com.qawi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional
    public CheckInResponse checkIn(String memberEmail) {
        User member = userRepository.findByEmail(memberEmail)
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));

        if (member.getGymId() == null) {
            throw new AppException("Member is not assigned to a gym", "المستخدم غير مرتبط بصالة", HttpStatus.BAD_REQUEST);
        }

        Optional<Attendance> lastOpt = attendanceRepository.findFirstByMemberIdOrderByCheckedInAtDesc(member.getId());
        Notification missedNotification = null;

        if (lastOpt.isPresent()) {
            long daysSinceLast = ChronoUnit.DAYS.between(
                    lastOpt.get().getCheckedInAt().toLocalDate(), LocalDate.now());
            if (daysSinceLast > 3) {
                missedNotification = notificationService.create(
                        member.getId(),
                        NotificationType.MISSED_DAYS,
                        "We missed you! You haven't trained in " + daysSinceLast + " days 💪",
                        "اشتقنا إليك! لم تتمرن منذ " + daysSinceLast + " أيام 💪"
                );
            }
        }

        Attendance attendance = attendanceRepository.save(Attendance.builder()
                .memberId(member.getId())
                .gymId(member.getGymId())
                .build());

        int streak = calculateStreak(member.getId());

        return CheckInResponse.builder()
                .attendance(attendance)
                .streak(streak)
                .notification(missedNotification)
                .build();
    }

    public List<Attendance> getByMember(UUID memberId) {
        return attendanceRepository.findByMemberIdOrderByCheckedInAtDesc(memberId);
    }

    public StreakResponse getStreak(UUID memberId) {
        Optional<Attendance> last = attendanceRepository.findFirstByMemberIdOrderByCheckedInAtDesc(memberId);
        int streak = calculateStreak(memberId);
        return StreakResponse.builder()
                .streak(streak)
                .lastCheckIn(last.map(Attendance::getCheckedInAt).orElse(null))
                .build();
    }

    private int calculateStreak(UUID memberId) {
        List<Attendance> all = attendanceRepository.findByMemberIdOrderByCheckedInAtDesc(memberId);
        if (all.isEmpty()) return 0;

        // Collect unique check-in dates
        Set<LocalDate> checkInDates = new LinkedHashSet<>();
        for (Attendance a : all) {
            checkInDates.add(a.getCheckedInAt().toLocalDate());
        }

        List<LocalDate> sortedDates = new ArrayList<>(checkInDates);
        sortedDates.sort(Comparator.reverseOrder());

        int streak = 0;
        LocalDate expected = LocalDate.now();

        for (LocalDate date : sortedDates) {
            if (!date.isAfter(expected) && !date.isBefore(expected.minusDays(1))) {
                streak++;
                expected = date.minusDays(1);
            } else if (date.isBefore(expected.minusDays(1))) {
                break;
            }
        }

        return streak;
    }
}
