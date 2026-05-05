package com.qawi.service;

import com.qawi.dto.CoachMemberSummary;
import com.qawi.entity.*;
import com.qawi.exception.AppException;
import com.qawi.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class CoachDashboardService {

    private final UserRepository userRepository;
    private final CoachMemberRepository coachMemberRepository;
    private final AttendanceRepository attendanceRepository;
    private final WorkoutPlanRepository workoutPlanRepository;
    private final WorkoutLogRepository workoutLogRepository;
    private final NutritionPlanRepository nutritionPlanRepository;
    private final MealRepository mealRepository;
    private final BodyMeasurementRepository bodyMeasurementRepository;
    private final CoachNoteRepository coachNoteRepository;
    private final ScheduleDayRepository scheduleDayRepository;
    private final PlanExerciseRepository planExerciseRepository;
    private final MealLogRepository mealLogRepository;

    @Transactional(readOnly = true)
    public List<CoachMemberSummary> getMyMembers(String coachEmail) {
        User coach = getCoach(coachEmail);
        List<CoachMember> assignments = coachMemberRepository.findByCoachId(coach.getId());
        LocalDateTime weekAgo = LocalDateTime.now().minusDays(7);

        return assignments.stream().map(cm -> {
            User member = userRepository.findById(cm.getMemberId()).orElse(null);
            if (member == null) return null;

            Optional<Attendance> lastCheckin = attendanceRepository
                    .findFirstByMemberIdOrderByCheckedInAtDesc(member.getId());

            List<WorkoutPlan> plans = workoutPlanRepository.findByMemberId(member.getId());
            String planName = plans.isEmpty() ? null : plans.get(plans.size() - 1).getName();

            long workoutsThisWeek = workoutLogRepository.countByMemberIdAndLoggedAtAfter(member.getId(), weekAgo);

            String subscriptionStatus = resolveSubStatus(member);

            // Nutrition status
            String nutritionStatus = "NO_PLAN";
            List<NutritionPlan> nutritionPlans = nutritionPlanRepository.findByMemberId(member.getId());
            if (!nutritionPlans.isEmpty()) {
                List<MealLog> todayLogs = mealLogRepository.findByMemberIdAndLogDate(member.getId(), LocalDate.now());
                nutritionStatus = todayLogs.isEmpty() ? "NOT_LOGGED" : "LOGGED";
            }

            return CoachMemberSummary.builder()
                    .id(member.getId()).name(member.getName()).email(member.getEmail())
                    .lastCheckinDate(lastCheckin.map(Attendance::getCheckedInAt).orElse(null))
                    .currentWorkoutPlanName(planName)
                    .workoutsCompletedThisWeek(workoutsThisWeek)
                    .subscriptionStatus(subscriptionStatus)
                    .isActive(member.isActive())
                    .nutritionStatus(nutritionStatus)
                    .build();
        }).filter(Objects::nonNull).toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getMemberOverview(UUID memberId, String coachEmail) {
        User coach = getCoach(coachEmail);
        User member = userRepository.findById(memberId)
                .orElseThrow(() -> new AppException("Member not found", "العضو غير موجود", HttpStatus.NOT_FOUND));
        boolean assigned = coachMemberRepository.findByCoachId(coach.getId()).stream()
                .anyMatch(cm -> cm.getMemberId().equals(memberId));
        if (!assigned
                || coach.getGymId() == null
                || !coach.getGymId().equals(member.getGymId())
                || !member.isActive()
                || member.getRole() != Role.MEMBER) {
            throw new AppException("Member not found", "العضو غير موجود", HttpStatus.NOT_FOUND);
        }

        // Current workout plan (most recent)
        List<WorkoutPlan> plans = workoutPlanRepository.findByMemberId(memberId);
        Map<String, Object> currentPlan = null;
        if (!plans.isEmpty()) {
            WorkoutPlan plan = plans.get(plans.size() - 1);
            Map<String, Object> planMap = new LinkedHashMap<>();
            planMap.put("id", plan.getId());
            planMap.put("name", plan.getName());
            planMap.put("startDate", plan.getStartDate());
            planMap.put("endDate", plan.getEndDate());

            List<ScheduleDay> days = scheduleDayRepository.findByWorkoutPlanIdOrderByDayDate(plan.getId());
            List<Map<String, Object>> dayList = days.stream().map(d -> {
                Map<String, Object> dm = new LinkedHashMap<>();
                dm.put("id", d.getId());
                dm.put("dayDate", d.getDayDate());
                dm.put("dayName", d.getDayName());
                dm.put("isRestDay", d.isRestDay());
                dm.put("isCompleted", d.isCompleted());
                dm.put("exercises", planExerciseRepository.findByScheduleDayIdOrderByOrderIndex(d.getId()));
                return dm;
            }).toList();
            planMap.put("scheduleDays", dayList);
            currentPlan = planMap;
        }

        // Nutrition plan (most recent)
        List<NutritionPlan> nutritionPlans = nutritionPlanRepository.findByMemberId(memberId);
        Map<String, Object> nutritionPlanMap = null;
        if (!nutritionPlans.isEmpty()) {
            NutritionPlan np = nutritionPlans.get(nutritionPlans.size() - 1);
            nutritionPlanMap = new LinkedHashMap<>();
            nutritionPlanMap.put("id", np.getId());
            nutritionPlanMap.put("meals", mealRepository.findByNutritionPlanIdOrderByOrderIndex(np.getId()));
        }

        // Latest measurements
        Optional<BodyMeasurement> latestMeasurement = bodyMeasurementRepository
                .findFirstByMemberIdOrderByRecordedAtDesc(memberId);
        Map<String, Object> measurementsMap = null;
        if (latestMeasurement.isPresent()) {
            BodyMeasurement bm = latestMeasurement.get();
            measurementsMap = new LinkedHashMap<>();
            measurementsMap.put("weight", bm.getWeight());
            measurementsMap.put("chest", bm.getChest());
            measurementsMap.put("waist", bm.getWaist());
            measurementsMap.put("arms", bm.getArms());
            measurementsMap.put("legs", bm.getLegs());
            measurementsMap.put("bodyFat", bm.getBodyFatPercentage());
            measurementsMap.put("recordedAt", bm.getRecordedAt());
        }

        // Attendance streak
        int streak = calculateStreak(memberId);

        // Coach notes
        List<CoachNote> notes = coachNoteRepository.findByMemberIdOrderByCreatedAtDesc(memberId);

        // Build member summary
        Map<String, Object> memberInfo = new LinkedHashMap<>();
        memberInfo.put("id", member.getId());
        memberInfo.put("name", member.getName());
        memberInfo.put("email", member.getEmail());
        memberInfo.put("subscriptionEndDate", member.getSubscriptionEndDate());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("member", memberInfo);
        result.put("currentWorkoutPlan", currentPlan);
        result.put("nutritionPlan", nutritionPlanMap);
        result.put("latestMeasurements", measurementsMap);
        result.put("attendanceStreak", streak);
        result.put("coachNotes", notes);
        return result;
    }

    private int calculateStreak(UUID memberId) {
        List<Attendance> all = attendanceRepository.findByMemberIdOrderByCheckedInAtDesc(memberId);
        if (all.isEmpty()) return 0;
        Set<LocalDate> dates = new LinkedHashSet<>();
        all.forEach(a -> dates.add(a.getCheckedInAt().toLocalDate()));
        List<LocalDate> sorted = new ArrayList<>(dates);
        sorted.sort(Comparator.reverseOrder());
        int streak = 0;
        LocalDate expected = LocalDate.now();
        for (LocalDate d : sorted) {
            if (!d.isAfter(expected) && !d.isBefore(expected.minusDays(1))) {
                streak++;
                expected = d.minusDays(1);
            } else if (d.isBefore(expected.minusDays(1))) break;
        }
        return streak;
    }

    private String resolveSubStatus(User member) {
        if (member.getSubscriptionEndDate() == null) return "UNKNOWN";
        LocalDate today = LocalDate.now();
        if (member.getSubscriptionEndDate().isBefore(today)) return "EXPIRED";
        if (member.getSubscriptionEndDate().isBefore(today.plusDays(7))) return "EXPIRING";
        return "ACTIVE";
    }

    private User getCoach(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));
    }
}
