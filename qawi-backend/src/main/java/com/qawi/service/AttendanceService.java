package com.qawi.service;

import com.qawi.dto.CheckInResponse;
import com.qawi.dto.StreakResponse;
import com.qawi.entity.*;
import com.qawi.exception.AppException;
import com.qawi.repository.AttendanceRepository;
import com.qawi.repository.CoachMemberRepository;
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
    private final CoachMemberRepository coachMemberRepository;
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

    @Transactional
    public Attendance checkOut(String memberEmail) {
        User member = userRepository.findByEmail(memberEmail)
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));

        LocalDate today = LocalDate.now();
        Attendance todays = attendanceRepository.findFirstByMemberIdOrderByCheckedInAtDesc(member.getId())
                .filter(a -> a.getCheckedInAt() != null && today.equals(a.getCheckedInAt().toLocalDate()))
                .orElseThrow(() -> new AppException(
                        "You haven't checked in today",
                        "لم تسجّل حضورك اليوم",
                        HttpStatus.BAD_REQUEST));

        todays.setCheckedOutAt(LocalDateTime.now());
        return attendanceRepository.save(todays);
    }

    public List<Attendance> getByMember(UUID memberId, String callerEmail) {
        assertCanAccessMember(memberId, callerEmail);
        return attendanceRepository.findByMemberIdOrderByCheckedInAtDesc(memberId);
    }

    /**
     * Tenant + assignment guard. Throws 403 if the caller may not view the
     * member's data. SUPER_ADMIN has access to everything; GYM_ADMIN must own
     * the member's gym; COACH must be assigned to the member.
     */
    private void assertCanAccessMember(UUID memberId, String callerEmail) {
        User caller = userRepository.findByEmail(callerEmail)
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));
        User member = userRepository.findById(memberId)
                .orElseThrow(() -> new AppException("Member not found", "العضو غير موجود", HttpStatus.NOT_FOUND));

        switch (caller.getRole()) {
            case SUPER_ADMIN -> { /* allowed */ }
            case GYM_ADMIN -> {
                if (caller.getGymId() == null || !caller.getGymId().equals(member.getGymId())) {
                    throw new AppException("Forbidden", "غير مسموح", HttpStatus.FORBIDDEN);
                }
            }
            case COACH -> {
                boolean assigned = coachMemberRepository.findByCoachId(caller.getId()).stream()
                        .anyMatch(cm -> memberId.equals(cm.getMemberId()));
                if (!assigned) {
                    throw new AppException("Forbidden", "غير مسموح", HttpStatus.FORBIDDEN);
                }
            }
            default -> throw new AppException("Forbidden", "غير مسموح", HttpStatus.FORBIDDEN);
        }
    }

    public List<Map<String, Object>> getMyAttendance(String memberEmail) {
        User me = userRepository.findByEmail(memberEmail)
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));
        return attendanceRepository.findByMemberIdOrderByCheckedInAtDesc(me.getId()).stream().map(a -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", a.getId());
            m.put("date", a.getCheckedInAt() == null ? null : a.getCheckedInAt().toString());
            m.put("checkedInAt", a.getCheckedInAt());
            m.put("checkedOutAt", a.getCheckedOutAt());
            return m;
        }).toList();
    }

    public Map<String, Object> getMyStats(String memberEmail) {
        User me = userRepository.findByEmail(memberEmail)
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));
        StreakResponse streak = getStreak(me.getId());
        List<Attendance> all = attendanceRepository.findByMemberIdOrderByCheckedInAtDesc(me.getId());
        LocalDate weekStart = LocalDate.now().minusDays(6);
        long thisWeek = all.stream()
                .filter(a -> a.getCheckedInAt() != null && !a.getCheckedInAt().toLocalDate().isBefore(weekStart))
                .map(a -> a.getCheckedInAt().toLocalDate())
                .distinct()
                .count();
        long total = all.stream()
                .filter(a -> a.getCheckedInAt() != null)
                .map(a -> a.getCheckedInAt().toLocalDate())
                .distinct()
                .count();
        Attendance todays = all.stream()
                .filter(a -> a.getCheckedInAt() != null
                        && LocalDate.now().equals(a.getCheckedInAt().toLocalDate()))
                .findFirst()
                .orElse(null);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("streak", streak.getStreak());
        out.put("lastCheckIn", streak.getLastCheckIn());
        out.put("thisWeek", thisWeek);
        out.put("totalDays", total);
        out.put("checkedInToday", todays != null);
        out.put("checkedOutToday", todays != null && todays.getCheckedOutAt() != null);
        out.put("checkedOutAt", todays == null ? null : todays.getCheckedOutAt());
        return out;
    }

    public StreakResponse getStreakForCaller(UUID memberId, String callerEmail) {
        assertCanAccessMember(memberId, callerEmail);
        return getStreak(memberId);
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
