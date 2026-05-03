package com.qawi.service;

import com.qawi.dto.*;
import com.qawi.entity.*;
import com.qawi.exception.AppException;
import com.qawi.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
public class GymAdminService {

    private final UserRepository userRepository;
    private final CoachMemberRepository coachMemberRepository;
    private final SubscriptionHistoryRepository subscriptionHistoryRepository;
    private final AttendanceRepository attendanceRepository;
    private final WorkoutLogRepository workoutLogRepository;
    private final PasswordEncoder passwordEncoder;
    private final NotificationService notificationService;
    private final GymRepository gymRepository;
    private final GymFeatureService gymFeatureService;

    // ── COACH CRUD ──────────────────────────────────────────────────────────

    @Transactional
    public User createCoach(CreateGymUserRequest req, String adminEmail) {
        UUID gymId = getAdmin(adminEmail).getGymId();
        validateNewEmail(req.getEmail());
        return userRepository.save(User.builder()
                .name(req.getName()).email(req.getEmail())
                .password(passwordEncoder.encode(req.getPassword()))
                .role(Role.COACH).gymId(gymId).build());
    }

    public List<User> getCoaches(String adminEmail) {
        UUID gymId = getAdmin(adminEmail).getGymId();
        return userRepository.findByGymIdAndRole(gymId, Role.COACH).stream()
                .filter(User::isActive).toList();
    }

    // ── MEMBER CRUD ──────────────────────────────────────────────────────────

    @Transactional
    public User createMember(CreateGymUserRequest req, String adminEmail) {
        UUID gymId = getAdmin(adminEmail).getGymId();
        validateNewEmail(req.getEmail());

        // Enforce per-gym maxMembers cap (null = unlimited)
        Gym gym = gymRepository.findById(gymId).orElse(null);
        if (gym != null && gym.getMaxMembers() != null) {
            long current = userRepository.countByGymIdAndRole(gymId, Role.MEMBER);
            if (current >= gym.getMaxMembers()) {
                throw new AppException(
                        "Member limit reached for this gym (" + gym.getMaxMembers() + "). Upgrade your plan to add more.",
                        "تم بلوغ الحد الأقصى لعدد الأعضاء (" + gym.getMaxMembers() + "). الرجاء ترقية الخطة.",
                        HttpStatus.FORBIDDEN);
            }
        }

        return userRepository.save(User.builder()
                .name(req.getName()).email(req.getEmail())
                .password(passwordEncoder.encode(req.getPassword()))
                .role(Role.MEMBER).gymId(gymId)
                .subscriptionEndDate(req.getSubscriptionEndDate())
                .build());
    }

    public List<User> getMembers(String adminEmail) {
        UUID gymId = getAdmin(adminEmail).getGymId();
        return userRepository.findByGymIdAndRole(gymId, Role.MEMBER).stream()
                .filter(User::isActive).toList();
    }

    @Transactional
    public CoachMember assignCoach(UUID memberId, AssignCoachRequest req, String adminEmail) {
        User admin = getAdmin(adminEmail);
        User member = userRepository.findById(memberId)
                .orElseThrow(() -> new AppException("Member not found", "العضو غير موجود", HttpStatus.NOT_FOUND));
        User coach = userRepository.findById(req.getCoachId())
                .orElseThrow(() -> new AppException("Coach not found", "المدرب غير موجود", HttpStatus.NOT_FOUND));
        if (member.getRole() != Role.MEMBER || !admin.getGymId().equals(member.getGymId()) || !member.isActive()) {
            throw new AppException("Member not found", "العضو غير موجود", HttpStatus.NOT_FOUND);
        }
        if (coach.getRole() != Role.COACH || !admin.getGymId().equals(coach.getGymId()) || !coach.isActive()) {
            throw new AppException("Coach not found", "المدرب غير موجود", HttpStatus.NOT_FOUND);
        }
        return coachMemberRepository.save(CoachMember.builder()
                .coachId(req.getCoachId()).memberId(memberId).build());
    }

    @Transactional
    public void softDelete(UUID userId, String adminEmail) {
        User admin = getAdmin(adminEmail);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));
        if (user.getGymId() == null || !user.getGymId().equals(admin.getGymId())) {
            throw new AppException("User is not in your gym", "المستخدم ليس في صالتك", HttpStatus.FORBIDDEN);
        }
        if (user.getRole() == Role.GYM_ADMIN) {
            throw new AppException("Cannot delete a gym admin", "لا يمكن حذف مسؤول الصالة", HttpStatus.FORBIDDEN);
        }
        if (user.getId().equals(admin.getId())) {
            throw new AppException("You cannot delete yourself", "لا يمكنك حذف نفسك", HttpStatus.FORBIDDEN);
        }
        if (user.getRole() == Role.COACH) {
            coachMemberRepository.deleteByCoachId(user.getId());
        } else if (user.getRole() == Role.MEMBER) {
            coachMemberRepository.deleteByMemberId(user.getId());
        }
        user.setActive(false);
        userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public List<User> getCoachMembers(UUID coachId, String adminEmail) {
        User admin = getAdmin(adminEmail);
        User coach = userRepository.findById(coachId)
                .orElseThrow(() -> new AppException("Coach not found", "المدرب غير موجود", HttpStatus.NOT_FOUND));
        if (coach.getRole() != Role.COACH || !admin.getGymId().equals(coach.getGymId())) {
            throw new AppException("Coach not found", "المدرب غير موجود", HttpStatus.NOT_FOUND);
        }
        List<UUID> memberIds = coachMemberRepository.findByCoachId(coachId).stream()
                .map(CoachMember::getMemberId).toList();
        if (memberIds.isEmpty()) return List.of();
        UUID gymId = admin.getGymId();
        return userRepository.findAllById(memberIds).stream()
                .filter(u -> u.getRole() == Role.MEMBER && u.isActive() && gymId.equals(u.getGymId()))
                .toList();
    }

    // ── SUBSCRIPTIONS ─────────────────────────────────────────────────────────

    @Transactional
    public Map<String, Object> updateMemberSubscription(UUID memberId, MemberSubscriptionRequest req, String adminEmail) {
        User admin = getAdmin(adminEmail);
        User member = userRepository.findById(memberId)
                .orElseThrow(() -> new AppException("Member not found", "العضو غير موجود", HttpStatus.NOT_FOUND));
        if (member.getRole() != Role.MEMBER
                || admin.getGymId() == null
                || !admin.getGymId().equals(member.getGymId())) {
            throw new AppException("Member not found", "العضو غير موجود", HttpStatus.NOT_FOUND);
        }

        member.setSubscriptionStartDate(req.getStartDate());
        member.setSubscriptionEndDate(req.getEndDate());
        userRepository.save(member);

        SubscriptionHistory history = subscriptionHistoryRepository.save(SubscriptionHistory.builder()
                .memberId(memberId)
                .managedByAdminId(admin.getId())
                .startDate(req.getStartDate())
                .endDate(req.getEndDate())
                .plan(req.getPlan())
                .price(req.getPrice())
                .build());

        long daysLeft = ChronoUnit.DAYS.between(LocalDate.now(), req.getEndDate());
        if (daysLeft < 7) {
            notificationService.create(memberId, NotificationType.SUBSCRIPTION_ALERT,
                    "Your subscription expires in " + daysLeft + " day(s). Please renew soon.",
                    "اشتراكك ينتهي خلال " + daysLeft + " يوم/أيام. يرجى التجديد قريبًا.");
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("member", member);
        result.put("subscriptionHistory", history);
        return result;
    }

    public List<SubscriptionHistory> getSubscriptionHistory(UUID memberId, String adminEmail) {
        User admin = getAdmin(adminEmail);
        User member = userRepository.findById(memberId)
                .orElseThrow(() -> new AppException("Member not found", "العضو غير موجود", HttpStatus.NOT_FOUND));
        if (member.getRole() != Role.MEMBER
                || admin.getGymId() == null
                || !admin.getGymId().equals(member.getGymId())) {
            throw new AppException("Member not found", "العضو غير موجود", HttpStatus.NOT_FOUND);
        }
        return subscriptionHistoryRepository.findByMemberIdOrderByCreatedAtDesc(memberId);
    }

    public List<User> getExpiringSubscriptions(String adminEmail) {
        UUID gymId = getAdmin(adminEmail).getGymId();
        return userRepository.findMembersWithExpiringSubscription(gymId, LocalDate.now(), LocalDate.now().plusDays(7));
    }

    // ── ANALYTICS ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public AdminAnalyticsResponse getAnalytics(String adminEmail) {
        User admin = getAdmin(adminEmail);
        UUID gymId = admin.getGymId();
        LocalDateTime now = LocalDateTime.now();
        LocalDate today = LocalDate.now();

        long totalMembers = userRepository.countByGymIdAndRole(gymId, Role.MEMBER);
        long totalCoaches = userRepository.countByGymIdAndRole(gymId, Role.COACH);

        // Active = checked in last 7 days
        List<UUID> activeMemberIds = attendanceRepository.findDistinctMemberIdsByGymIdAndCheckedInAtAfter(gymId, now.minusDays(7));
        long activeMembers = activeMemberIds.size();

        // Inactive = no checkin in 14+ days — get all members and subtract recently active
        List<UUID> recentlyActive = attendanceRepository.findDistinctMemberIdsByGymIdAndCheckedInAtAfter(gymId, now.minusDays(14));
        long inactiveMembers = totalMembers - recentlyActive.size();

        long expiringThisWeek = userRepository.findMembersWithExpiringSubscription(gymId, today, today.plusDays(7)).size();
        long expiredMembers = userRepository.findExpiredMembers(gymId, today).size();

        // Avg workouts per member (all-time logs / members)
        double avgWorkouts = 0;
        if (totalMembers > 0) {
            long totalLogs = workoutLogRepository.count();
            avgWorkouts = Math.round((double) totalLogs / totalMembers * 10.0) / 10.0;
        }

        // Attendance per day for last 7 days
        List<Attendance> weekAttendance = attendanceRepository.findByGymIdAndCheckedInAtAfterOrdered(gymId, now.minusDays(7));
        Map<String, Long> dayCountMap = new LinkedHashMap<>();
        for (int i = 6; i >= 0; i--) {
            dayCountMap.put(today.minusDays(i).toString(), 0L);
        }
        for (Attendance a : weekAttendance) {
            String day = a.getCheckedInAt().toLocalDate().toString();
            dayCountMap.merge(day, 1L, Long::sum);
        }
        List<Map<String, Object>> attendanceThisWeek = new ArrayList<>();
        dayCountMap.forEach((day, count) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("day", day); m.put("count", count);
            attendanceThisWeek.add(m);
        });

        // Top performing members (by all-time log count)
        List<Object[]> topRaw = workoutLogRepository.findTopMembersByLogsSince(now.minusDays(365));
        List<Map<String, Object>> topPerforming = new ArrayList<>();
        for (int i = 0; i < Math.min(5, topRaw.size()); i++) {
            Object[] row = topRaw.get(i);
            UUID mid = (UUID) row[0];
            long cnt = (Long) row[1];
            userRepository.findById(mid).ifPresent(u -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("name", u.getName()); m.put("workoutsLogged", cnt);
                topPerforming.add(m);
            });
        }

        // Revenue this month
        double revenueThisMonth = subscriptionHistoryRepository.sumRevenueSince(
                now.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0));

        // Member growth — last 6 months
        List<Object[]> growthRaw = userRepository.findMemberGrowthByGym(gymId, now.minusMonths(6));
        List<Map<String, Object>> memberGrowth = new ArrayList<>();
        for (Object[] row : growthRaw) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("month", row[0] + "-" + String.format("%02d", row[1]));
            m.put("count", row[2]);
            memberGrowth.add(m);
        }

        boolean advanced = gymFeatureService.isEnabledForGymId(gymId, GymFeatureService.Feature.ANALYTICS_ADVANCED);

        return AdminAnalyticsResponse.builder()
                .totalMembers(totalMembers).activeMembers(activeMembers)
                .inactiveMembers(Math.max(0, inactiveMembers)).totalCoaches(totalCoaches)
                .expiringThisWeek(expiringThisWeek).expiredMembers(expiredMembers)
                .avgWorkoutsPerMember(advanced ? avgWorkouts : 0d)
                .attendanceThisWeek(advanced ? attendanceThisWeek : List.of())
                .topPerformingMembers(advanced ? topPerforming : List.of())
                .revenueThisMonth(advanced ? revenueThisMonth : 0d)
                .memberGrowth(advanced ? memberGrowth : List.of())
                .build();
    }

    // ── HELPERS ───────────────────────────────────────────────────────────────

    private User getAdmin(String email) {
        User u = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));
        if (u.getRole() != Role.GYM_ADMIN) {
            throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);
        }
        return u;
    }

    private void validateNewEmail(String email) {
        if (userRepository.existsByEmail(email)) {
            throw new AppException("Email already in use", "البريد الإلكتروني مستخدم بالفعل", HttpStatus.CONFLICT);
        }
    }
}
