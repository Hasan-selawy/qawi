package com.qawi.service;

import com.qawi.dto.StaffAttendanceRequest;
import com.qawi.dto.StaffProfileRequest;
import com.qawi.entity.*;
import com.qawi.exception.AppException;
import com.qawi.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class HrService {

    private final UserRepository userRepository;
    private final StaffProfileRepository staffProfileRepository;
    private final StaffAttendanceRepository staffAttendanceRepository;
    private final CoachMemberRepository coachMemberRepository;
    private final AttendanceRepository attendanceRepository;
    private final WorkoutPlanRepository workoutPlanRepository;

    private User loadHr(String email) {
        User u = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));
        if (u.getRole() != Role.HR && u.getRole() != Role.GYM_ADMIN)
            throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);
        return u;
    }

    public List<Map<String, Object>> getAllStaff(String email) {
        User caller = loadHr(email);
        List<Role> staffRoles = List.of(Role.COACH, Role.RECEPTIONIST, Role.ACCOUNTANT, Role.HR, Role.GYM_ADMIN);
        List<User> staff = userRepository.findByGymId(caller.getGymId()).stream()
                .filter(u -> staffRoles.contains(u.getRole()))
                .collect(Collectors.toList());
        return staff.stream().map(u -> buildStaffEntry(u)).collect(Collectors.toList());
    }

    @Transactional
    public Map<String, Object> upsertProfile(String email, UUID userId, StaffProfileRequest req) {
        User caller = loadHr(email);
        User staff = userRepository.findById(userId)
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));
        if (!caller.getGymId().equals(staff.getGymId()))
            throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);

        StaffProfile profile = staffProfileRepository.findByUserId(userId)
                .orElse(StaffProfile.builder().gymId(caller.getGymId()).userId(userId).build());
        profile.setJobTitle(req.getJobTitle());
        profile.setStartDate(req.getStartDate());
        profile.setSalary(req.getSalary());
        profile.setEmploymentType(req.getEmploymentType());
        profile.setEmergencyContact(req.getEmergencyContact());
        profile.setNotes(req.getNotes());
        profile = staffProfileRepository.save(profile);
        return buildProfileMap(profile, staff);
    }

    public List<Map<String, Object>> getStaffAttendance(String email, UUID staffUserId) {
        User caller = loadHr(email);
        User staff = userRepository.findById(staffUserId)
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));
        if (!caller.getGymId().equals(staff.getGymId()))
            throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);

        StaffProfile profile = staffProfileRepository.findByUserId(staffUserId)
                .orElseThrow(() -> new AppException("Staff profile not found", "الملف الشخصي غير موجود", HttpStatus.NOT_FOUND));

        return staffAttendanceRepository.findByStaffId(profile.getId()).stream()
                .map(a -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", a.getId());
                    m.put("date", a.getDate());
                    m.put("checkIn", a.getCheckIn());
                    m.put("checkOut", a.getCheckOut());
                    m.put("status", a.getStatus());
                    m.put("notes", a.getNotes());
                    return m;
                }).collect(Collectors.toList());
    }

    @Transactional
    public Map<String, Object> logAttendance(String email, UUID staffUserId, StaffAttendanceRequest req) {
        User caller = loadHr(email);
        User staff = userRepository.findById(staffUserId)
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));
        if (!caller.getGymId().equals(staff.getGymId()))
            throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);

        StaffProfile profile = staffProfileRepository.findByUserId(staffUserId)
                .orElseGet(() -> staffProfileRepository.save(
                        StaffProfile.builder().gymId(caller.getGymId()).userId(staffUserId).build()));

        StaffAttendance att = staffAttendanceRepository.findByStaffIdAndDate(profile.getId(), req.getDate())
                .orElse(StaffAttendance.builder().staffId(profile.getId()).build());
        att.setDate(req.getDate());
        att.setCheckIn(req.getCheckIn());
        att.setCheckOut(req.getCheckOut());
        att.setStatus(req.getStatus() != null ? req.getStatus() : "PRESENT");
        att.setNotes(req.getNotes());
        att = staffAttendanceRepository.save(att);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", att.getId());
        result.put("staffUserId", staffUserId);
        result.put("date", att.getDate());
        result.put("status", att.getStatus());
        return result;
    }

    public Map<String, Object> getTodayAttendance(String email) {
        User caller = loadHr(email);
        List<StaffProfile> profiles = staffProfileRepository.findByGymId(caller.getGymId());
        List<UUID> profileIds = profiles.stream().map(StaffProfile::getId).collect(Collectors.toList());

        List<StaffAttendance> todayAtt = profileIds.isEmpty()
                ? new ArrayList<>()
                : staffAttendanceRepository.findByStaffIdsAndDate(profileIds, LocalDate.now());

        Set<UUID> presentIds = todayAtt.stream().filter(a -> "PRESENT".equals(a.getStatus())).map(StaffAttendance::getStaffId).collect(Collectors.toSet());
        Set<UUID> lateIds = todayAtt.stream().filter(a -> "LATE".equals(a.getStatus())).map(StaffAttendance::getStaffId).collect(Collectors.toSet());
        Set<UUID> leaveIds = todayAtt.stream().filter(a -> "LEAVE".equals(a.getStatus())).map(StaffAttendance::getStaffId).collect(Collectors.toSet());
        long absent = Math.max(0, profiles.size() - presentIds.size() - lateIds.size() - leaveIds.size());

        List<Map<String, Object>> details = new ArrayList<>();
        for (StaffProfile p : profiles) {
            userRepository.findById(p.getUserId()).ifPresent(u -> {
                StaffAttendance att = todayAtt.stream().filter(a -> a.getStaffId().equals(p.getId())).findFirst().orElse(null);
                Map<String, Object> d = new LinkedHashMap<>();
                d.put("userId", u.getId());
                d.put("name", u.getName());
                d.put("role", u.getRole());
                d.put("jobTitle", p.getJobTitle());
                d.put("status", att != null ? att.getStatus() : "ABSENT");
                d.put("checkIn", att != null ? att.getCheckIn() : null);
                d.put("checkOut", att != null ? att.getCheckOut() : null);
                details.add(d);
            });
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("present", presentIds.size());
        result.put("late", lateIds.size());
        result.put("onLeave", leaveIds.size());
        result.put("absent", absent);
        result.put("total", profiles.size());
        result.put("date", LocalDate.now());
        result.put("details", details);
        return result;
    }

    public Map<String, Object> getAttendanceReport(String email) {
        User caller = loadHr(email);
        List<StaffProfile> profiles = staffProfileRepository.findByGymId(caller.getGymId());
        List<UUID> profileIds = profiles.stream().map(StaffProfile::getId).collect(Collectors.toList());

        LocalDate startOfMonth = LocalDate.now().withDayOfMonth(1);
        LocalDate today = LocalDate.now();
        List<StaffAttendance> monthAtt = profileIds.isEmpty() ? new ArrayList<>()
                : staffAttendanceRepository.findByStaffIdsAndDateRange(profileIds, startOfMonth, today.plusDays(1));

        List<Map<String, Object>> rows = new ArrayList<>();
        for (StaffProfile p : profiles) {
            userRepository.findById(p.getUserId()).ifPresent(u -> {
                List<StaffAttendance> myAtt = monthAtt.stream().filter(a -> a.getStaffId().equals(p.getId())).collect(Collectors.toList());
                long present = myAtt.stream().filter(a -> "PRESENT".equals(a.getStatus())).count();
                long late = myAtt.stream().filter(a -> "LATE".equals(a.getStatus())).count();
                long att_absent = myAtt.stream().filter(a -> "ABSENT".equals(a.getStatus())).count();
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("userId", u.getId());
                row.put("name", u.getName());
                row.put("role", u.getRole());
                row.put("jobTitle", p.getJobTitle());
                row.put("present", present);
                row.put("late", late);
                row.put("absent", att_absent);
                row.put("total", myAtt.size());
                rows.add(row);
            });
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("month", startOfMonth.getMonth().name());
        result.put("year", startOfMonth.getYear());
        result.put("staff", rows);
        return result;
    }

    public Map<String, Object> getCoachPerformance(String email, UUID coachId) {
        User caller = loadHr(email);
        User coach = userRepository.findById(coachId)
                .orElseThrow(() -> new AppException("Coach not found", "المدرب غير موجود", HttpStatus.NOT_FOUND));
        if (!caller.getGymId().equals(coach.getGymId()))
            throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);

        List<CoachMember> assignments = coachMemberRepository.findByCoachId(coachId);
        int assignedMembers = assignments.size();
        List<UUID> memberIds = assignments.stream().map(CoachMember::getMemberId).collect(Collectors.toList());

        long plansCreated = workoutPlanRepository.findAll().stream()
                .filter(p -> coachId.equals(p.getCoachId())).count();

        int avgStreak = 0;
        if (!memberIds.isEmpty()) {
            int totalStreak = 0;
            for (UUID mId : memberIds) {
                List<Attendance> atts = attendanceRepository.findByMemberIdOrderByCheckedInAtDesc(mId);
                int streak = 0;
                LocalDate check = LocalDate.now();
                Set<LocalDate> days = new HashSet<>();
                for (Attendance a : atts) days.add(a.getCheckedInAt().toLocalDate());
                while (days.contains(check)) { streak++; check = check.minusDays(1); }
                totalStreak += streak;
            }
            avgStreak = totalStreak / memberIds.size();
        }

        long activeMembers = memberIds.stream()
                .map(id -> userRepository.findById(id).orElse(null))
                .filter(m -> m != null && m.getSubscriptionEndDate() != null
                        && !m.getSubscriptionEndDate().isBefore(LocalDate.now()))
                .count();
        double retention = assignedMembers == 0 ? 0 : Math.round((double) activeMembers / assignedMembers * 10000.0) / 100.0;
        double score = (assignedMembers * 0.20) + (plansCreated * 0.30) + (retention * 0.30) + (avgStreak * 0.20);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("coachId", coachId);
        result.put("coachName", coach.getName());
        result.put("assignedMembers", assignedMembers);
        result.put("plansCreated", plansCreated);
        result.put("retention", retention);
        result.put("averageStreak", avgStreak);
        result.put("score", Math.round(score * 10.0) / 10.0);
        return result;
    }

    public List<Map<String, Object>> getAllCoachPerformance(String email) {
        User caller = loadHr(email);
        return userRepository.findByGymIdAndRole(caller.getGymId(), Role.COACH).stream()
                .map(c -> getCoachPerformance(email, c.getId()))
                .sorted((a, b) -> Double.compare((double) b.get("score"), (double) a.get("score")))
                .collect(Collectors.toList());
    }

    private Map<String, Object> buildStaffEntry(User u) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("userId", u.getId());
        item.put("name", u.getName());
        item.put("email", u.getEmail());
        item.put("role", u.getRole());
        item.put("active", u.isActive());
        staffProfileRepository.findByUserId(u.getId()).ifPresentOrElse(p -> {
            item.put("jobTitle", p.getJobTitle());
            item.put("employmentType", p.getEmploymentType());
            item.put("startDate", p.getStartDate());
            item.put("salary", p.getSalary());
            item.put("profileId", p.getId());
        }, () -> {
            item.put("jobTitle", null);
            item.put("profileId", null);
        });
        return item;
    }

    private Map<String, Object> buildProfileMap(StaffProfile p, User u) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", p.getId());
        result.put("userId", p.getUserId());
        result.put("name", u.getName());
        result.put("email", u.getEmail());
        result.put("role", u.getRole());
        result.put("jobTitle", p.getJobTitle());
        result.put("startDate", p.getStartDate());
        result.put("salary", p.getSalary());
        result.put("employmentType", p.getEmploymentType());
        result.put("emergencyContact", p.getEmergencyContact());
        result.put("notes", p.getNotes());
        result.put("active", p.isActive());
        return result;
    }
}
