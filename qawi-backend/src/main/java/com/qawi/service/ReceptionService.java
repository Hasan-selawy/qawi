package com.qawi.service;

import com.qawi.dto.CreateWalkInMemberRequest;
import com.qawi.dto.ReceptionMemberResult;
import com.qawi.dto.ReceptionTodayStats;
import com.qawi.dto.RenewSubscriptionRequest;
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
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReceptionService {

    private final UserRepository userRepository;
    private final AttendanceRepository attendanceRepository;
    private final CoachMemberRepository coachMemberRepository;
    private final GymRepository gymRepository;
    private final PasswordEncoder passwordEncoder;

    private User loadReceptionist(String email) {
        User u = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));
        if (u.getRole() != Role.RECEPTIONIST && u.getRole() != Role.GYM_ADMIN)
            throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);
        return u;
    }

    public List<ReceptionMemberResult> searchMembers(String email, String q) {
        User caller = loadReceptionist(email);
        String lower = q == null ? "" : q.toLowerCase().trim();

        List<User> members = userRepository.findByGymIdAndRole(caller.getGymId(), Role.MEMBER);

        if (!lower.isEmpty()) {
            members = members.stream()
                    .filter(m -> contains(m.getName(), lower) || contains(m.getEmail(), lower)
                            || contains(m.getPhone(), lower))
                    .collect(Collectors.toList());
        }

        return members.stream().map(m -> buildResult(m, caller.getGymId())).collect(Collectors.toList());
    }

    public Map<String, Object> checkIn(String email, UUID memberId) {
        User caller = loadReceptionist(email);
        User member = userRepository.findById(memberId)
                .orElseThrow(() -> new AppException("Member not found", "العضو غير موجود", HttpStatus.NOT_FOUND));

        if (!caller.getGymId().equals(member.getGymId()))
            throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);

        LocalDateTime now = LocalDateTime.now();
        Attendance att = Attendance.builder()
                .memberId(memberId)
                .gymId(caller.getGymId())
                .checkedInAt(now)
                .build();
        attendanceRepository.save(att);

        String subscriptionStatus = getSubscriptionStatus(member);
        int streak = calcStreak(memberId);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("memberId", memberId);
        result.put("memberName", member.getName());
        result.put("checkedInAt", now);
        result.put("streak", streak);
        result.put("subscriptionStatus", subscriptionStatus);
        return result;
    }

    @Transactional
    public Map<String, Object> createWalkInMember(String email, CreateWalkInMemberRequest req) {
        User caller = loadReceptionist(email);

        if (userRepository.existsByEmail(req.getEmail()))
            throw new AppException("Email already registered", "البريد الإلكتروني مستخدم بالفعل", HttpStatus.CONFLICT);

        String tempPassword = "Qawi@" + (int)(Math.random() * 9000 + 1000);
        User member = User.builder()
                .name(req.getName())
                .email(req.getEmail())
                .phone(req.getPhone())
                .password(passwordEncoder.encode(tempPassword))
                .role(Role.MEMBER)
                .gymId(caller.getGymId())
                .subscriptionStartDate(LocalDate.now())
                .subscriptionEndDate(req.getSubscriptionEndDate())
                .build();
        member = userRepository.save(member);

        if (req.getCoachId() != null) {
            coachMemberRepository.save(CoachMember.builder()
                    .coachId(req.getCoachId())
                    .memberId(member.getId())
                    .build());
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("memberId", member.getId());
        result.put("name", member.getName());
        result.put("email", member.getEmail());
        result.put("temporaryPassword", tempPassword);
        return result;
    }

    @Transactional
    public Map<String, Object> assignCoach(String email, UUID memberId, UUID coachId) {
        User caller = loadReceptionist(email);
        User member = userRepository.findById(memberId)
                .orElseThrow(() -> new AppException("Member not found", "العضو غير موجود", HttpStatus.NOT_FOUND));
        User coach = userRepository.findById(coachId)
                .orElseThrow(() -> new AppException("Coach not found", "المدرب غير موجود", HttpStatus.NOT_FOUND));

        if (!caller.getGymId().equals(member.getGymId()) || !caller.getGymId().equals(coach.getGymId()))
            throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);

        coachMemberRepository.findByCoachId(coachId).stream()
                .filter(cm -> cm.getMemberId().equals(memberId))
                .findFirst()
                .ifPresent(coachMemberRepository::delete);

        coachMemberRepository.save(CoachMember.builder()
                .coachId(coachId)
                .memberId(memberId)
                .build());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("memberId", memberId);
        result.put("coachId", coachId);
        result.put("coachName", coach.getName());
        return result;
    }

    @Transactional
    public Map<String, Object> renewSubscription(String email, UUID memberId, RenewSubscriptionRequest req) {
        User caller = loadReceptionist(email);
        User member = userRepository.findById(memberId)
                .orElseThrow(() -> new AppException("Member not found", "العضو غير موجود", HttpStatus.NOT_FOUND));

        if (!caller.getGymId().equals(member.getGymId()))
            throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);

        LocalDate base = member.getSubscriptionEndDate() != null && member.getSubscriptionEndDate().isAfter(LocalDate.now())
                ? member.getSubscriptionEndDate() : LocalDate.now();
        LocalDate newEnd = base.plusMonths(req.getDurationMonths());

        if (member.getSubscriptionStartDate() == null)
            member.setSubscriptionStartDate(LocalDate.now());
        member.setSubscriptionEndDate(newEnd);
        userRepository.save(member);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("memberId", memberId);
        result.put("memberName", member.getName());
        result.put("newSubscriptionEndDate", newEnd);
        result.put("durationMonths", req.getDurationMonths());
        return result;
    }

    public Map<String, Object> getTodayStats(String email) {
        User caller = loadReceptionist(email);
        UUID gymId = caller.getGymId();
        LocalDateTime startOfDay = LocalDateTime.now().toLocalDate().atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1);

        List<Attendance> todayAtt = attendanceRepository.findByGymIdAndCheckedInAtBetween(gymId, startOfDay, endOfDay);
        long checkedInToday = todayAtt.stream().map(Attendance::getMemberId).distinct().count();

        List<User> members = userRepository.findByGymIdAndRole(gymId, Role.MEMBER);
        LocalDate today = LocalDate.now();
        LocalDate weekEnd = today.plusDays(7);

        long expectedToday = members.stream()
                .filter(m -> m.getSubscriptionEndDate() != null && !m.getSubscriptionEndDate().isBefore(today))
                .count();

        long expiredMembersCount = members.stream()
                .filter(m -> m.getSubscriptionEndDate() != null && m.getSubscriptionEndDate().isBefore(today))
                .count();

        List<User> expiringUsers = members.stream()
                .filter(m -> m.getSubscriptionEndDate() != null
                        && !m.getSubscriptionEndDate().isBefore(today)
                        && !m.getSubscriptionEndDate().isAfter(weekEnd))
                .sorted(Comparator.comparing(User::getSubscriptionEndDate))
                .collect(Collectors.toList());

        long newMembersThisWeek = members.stream()
                .filter(m -> m.getCreatedAt() != null && m.getCreatedAt().isAfter(today.minusDays(7).atStartOfDay()))
                .count();

        List<Map<String, Object>> expiringList = expiringUsers.stream().map(m -> {
            long daysLeft = today.until(m.getSubscriptionEndDate(), java.time.temporal.ChronoUnit.DAYS);
            String coachName = coachMemberRepository.findByMemberId(m.getId()).stream()
                    .findFirst()
                    .flatMap(cm -> userRepository.findById(cm.getCoachId()))
                    .map(User::getName).orElse(null);
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("memberId", m.getId());
            item.put("memberName", m.getName());
            item.put("phoneNumber", m.getPhone());
            item.put("subscriptionEndDate", m.getSubscriptionEndDate());
            item.put("daysUntilExpiry", daysLeft);
            item.put("coachName", coachName);
            return item;
        }).collect(Collectors.toList());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("checkedInToday", checkedInToday);
        result.put("expectedToday", expectedToday);
        result.put("expiringThisWeek", (long) expiringUsers.size());
        result.put("expiredMembersCount", expiredMembersCount);
        result.put("totalCheckins", (long) todayAtt.size());
        result.put("newMembersThisWeek", newMembersThisWeek);
        result.put("expiringMembers", expiringList);
        return result;
    }

    @Transactional
    public Map<String, Object> updateContact(String email, UUID memberId, Map<String, String> body) {
        User caller = loadReceptionist(email);
        User member = userRepository.findById(memberId)
                .orElseThrow(() -> new AppException("Member not found", "العضو غير موجود", HttpStatus.NOT_FOUND));
        if (!caller.getGymId().equals(member.getGymId()))
            throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);

        if (body.get("phoneNumber") != null && !body.get("phoneNumber").isBlank())
            member.setPhone(body.get("phoneNumber").trim());
        if (body.get("email") != null && !body.get("email").isBlank()) {
            String newEmail = body.get("email").trim().toLowerCase();
            if (!newEmail.equals(member.getEmail())) {
                if (userRepository.existsByEmail(newEmail))
                    throw new AppException("Email already in use", "البريد الإلكتروني مستخدم بالفعل", HttpStatus.CONFLICT);
                member.setEmail(newEmail);
            }
        }
        userRepository.save(member);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("memberId", memberId);
        res.put("name", member.getName());
        res.put("phone", member.getPhone());
        res.put("email", member.getEmail());
        return res;
    }

    public List<Map<String, Object>> getLiveFeed(String email) {
        User caller = loadReceptionist(email);
        LocalDateTime startOfDay = LocalDateTime.now().toLocalDate().atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1);

        List<Attendance> todayAtt = attendanceRepository.findByGymIdAndCheckedInAtBetween(
                caller.getGymId(), startOfDay, endOfDay);

        List<Map<String, Object>> feed = new ArrayList<>();
        for (Attendance att : todayAtt) {
            userRepository.findById(att.getMemberId()).ifPresent(member -> {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("memberId", member.getId());
                item.put("memberName", member.getName());
                item.put("checkedInAt", att.getCheckedInAt());
                item.put("streak", calcStreak(member.getId()));
                feed.add(item);
            });
        }
        feed.sort((a, b) -> ((LocalDateTime) b.get("checkedInAt"))
                .compareTo((LocalDateTime) a.get("checkedInAt")));
        return feed;
    }

    public List<Map<String, Object>> getAlerts(String email) {
        User caller = loadReceptionist(email);
        UUID gymId = caller.getGymId();
        List<User> members = userRepository.findByGymIdAndRole(gymId, Role.MEMBER);
        List<Map<String, Object>> alerts = new ArrayList<>();
        LocalDate today = LocalDate.now();
        LocalDateTime inactiveCutoff = LocalDateTime.now().minusDays(14);

        for (User m : members) {
            String type = null;
            String message = null;
            String messageAr = null;

            if (m.getSubscriptionEndDate() != null && m.getSubscriptionEndDate().isBefore(today)) {
                type = "EXPIRED";
                message = m.getName() + " subscription expired";
                messageAr = "انتهى اشتراك " + m.getName();
            }

            List<Attendance> recent = attendanceRepository.findByMemberIdOrderByCheckedInAtDesc(m.getId());
            boolean inactive = recent.isEmpty() || recent.get(0).getCheckedInAt().isBefore(inactiveCutoff);

            List<CoachMember> assignments = coachMemberRepository.findByMemberId(m.getId());
            boolean noCoach = assignments.isEmpty();

            if (type == null && inactive) {
                type = "INACTIVE";
                message = m.getName() + " inactive for 14+ days";
                messageAr = m.getName() + " غير نشط منذ 14 يوم";
            }
            if (type == null && noCoach) {
                type = "NO_COACH";
                message = m.getName() + " has no assigned coach";
                messageAr = m.getName() + " ليس لديه مدرب";
            }

            if (type != null) {
                Map<String, Object> alert = new LinkedHashMap<>();
                alert.put("memberId", m.getId());
                alert.put("memberName", m.getName());
                alert.put("type", type);
                alert.put("message", message);
                alert.put("messageAr", messageAr);
                alerts.add(alert);
            }
        }
        return alerts;
    }

    public List<User> getGymCoaches(String email) {
        User caller = loadReceptionist(email);
        return userRepository.findByGymIdAndRole(caller.getGymId(), Role.COACH);
    }

    private ReceptionMemberResult buildResult(User m, UUID gymId) {
        List<CoachMember> assignments = coachMemberRepository.findByMemberId(m.getId());
        String coachName = assignments.stream()
                .findFirst()
                .flatMap(cm -> userRepository.findById(cm.getCoachId()))
                .map(User::getName)
                .orElse(null);

        List<Attendance> recent = attendanceRepository.findByMemberIdOrderByCheckedInAtDesc(m.getId());
        LocalDateTime lastCheckin = recent.isEmpty() ? null : recent.get(0).getCheckedInAt();

        LocalDateTime startOfDay = LocalDateTime.now().toLocalDate().atStartOfDay();
        boolean checkedInToday = recent.stream().anyMatch(a -> a.getCheckedInAt().isAfter(startOfDay));

        return ReceptionMemberResult.builder()
                .id(m.getId())
                .name(m.getName())
                .email(m.getEmail())
                .phone(m.getPhone())
                .coachName(coachName)
                .subscriptionStatus(getSubscriptionStatus(m))
                .subscriptionEndDate(m.getSubscriptionEndDate())
                .lastCheckin(lastCheckin)
                .attendanceStreak(calcStreak(m.getId()))
                .active(m.isActive())
                .checkedInToday(checkedInToday)
                .build();
    }

    private String getSubscriptionStatus(User m) {
        if (m.getSubscriptionEndDate() == null) return "NO_PLAN";
        LocalDate today = LocalDate.now();
        if (m.getSubscriptionEndDate().isBefore(today)) return "EXPIRED";
        if (m.getSubscriptionEndDate().isBefore(today.plusDays(7))) return "EXPIRING_SOON";
        return "ACTIVE";
    }

    private int calcStreak(UUID memberId) {
        List<Attendance> all = attendanceRepository.findByMemberIdOrderByCheckedInAtDesc(memberId);
        if (all.isEmpty()) return 0;
        int streak = 0;
        LocalDate check = LocalDate.now();
        Set<LocalDate> days = new HashSet<>();
        for (Attendance a : all) days.add(a.getCheckedInAt().toLocalDate());
        while (days.contains(check)) {
            streak++;
            check = check.minusDays(1);
        }
        return streak;
    }

    private boolean contains(String val, String q) {
        return val != null && val.toLowerCase().contains(q);
    }
}
