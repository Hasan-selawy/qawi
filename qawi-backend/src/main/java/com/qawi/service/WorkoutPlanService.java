package com.qawi.service;

import com.qawi.dto.*;
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
public class WorkoutPlanService {

    private final WorkoutPlanRepository planRepository;
    private final ScheduleDayRepository scheduleDayRepository;
    private final PlanExerciseRepository planExerciseRepository;
    private final WorkoutLogRepository logRepository;
    private final WorkoutTemplateRepository templateRepository;
    private final WorkoutTemplateDayRepository templateDayRepository;
    private final WorkoutTemplateDayExerciseRepository templateDayExerciseRepository;
    private final NotificationService notificationService;
    private final AccessGuard accessGuard;

    @Transactional
    public WorkoutPlan createPlan(CreateWorkoutPlanRequest req, String coachEmail) {
        User coach = accessGuard.loadUserByEmail(coachEmail);
        accessGuard.assertCoachManagesMember(coachEmail, req.getMemberId());
        return planRepository.save(WorkoutPlan.builder()
                .name(req.getName())
                .coachId(coach.getId())
                .memberId(req.getMemberId())
                .startDate(req.getStartDate())
                .endDate(req.getEndDate())
                .build());
    }

    @Transactional
    public Map<String, Object> createFromTemplate(CreateFromTemplateRequest req, String coachEmail) {
        User coach = accessGuard.loadUserByEmail(coachEmail);
        accessGuard.assertCoachManagesMember(coachEmail, req.getMemberId());

        WorkoutTemplate template = templateRepository.findById(req.getTemplateId())
                .orElseThrow(() -> new AppException("Template not found", "القالب غير موجود", HttpStatus.NOT_FOUND));

        List<WorkoutTemplateDay> templateDays = templateDayRepository.findByTemplateIdOrderByDayNumber(template.getId());

        LocalDate endDate = req.getStartDate().plusDays(Math.max(templateDays.size() - 1, 0));

        WorkoutPlan plan = planRepository.save(WorkoutPlan.builder()
                .name(template.getName())
                .coachId(coach.getId())
                .memberId(req.getMemberId())
                .startDate(req.getStartDate())
                .endDate(endDate)
                .build());

        for (int i = 0; i < templateDays.size(); i++) {
            WorkoutTemplateDay templateDay = templateDays.get(i);
            LocalDate dayDate = req.getStartDate().plusDays(i);

            ScheduleDay scheduleDay = scheduleDayRepository.save(ScheduleDay.builder()
                    .workoutPlanId(plan.getId())
                    .dayDate(dayDate)
                    .dayName(templateDay.getDayName())
                    .dayNameAr(templateDay.getDayNameAr())
                    .isRestDay(templateDay.isRestDay())
                    .build());

            List<WorkoutTemplateDayExercise> templateExercises =
                    templateDayExerciseRepository.findByTemplateDayIdOrderByOrderIndex(templateDay.getId());

            for (WorkoutTemplateDayExercise ex : templateExercises) {
                planExerciseRepository.save(PlanExercise.builder()
                        .scheduleDayId(scheduleDay.getId())
                        .exerciseTemplateId(ex.getExerciseTemplateId())
                        .customName(ex.getCustomName())
                        .customNameAr(ex.getCustomNameAr())
                        .sets(ex.getSets())
                        .reps(ex.getReps())
                        .targetWeight(ex.getTargetWeight())
                        .videoUrl(ex.getVideoUrl())
                        .orderIndex(ex.getOrderIndex())
                        .build());
            }
        }

        return buildPlanDetail(plan);
    }

    @Transactional(readOnly = true)
    public List<WorkoutPlan> getPlansByMember(UUID memberId, String callerEmail) {
        accessGuard.assertCanAccessMember(callerEmail, memberId);
        return planRepository.findByMemberId(memberId);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getPlanDetail(UUID planId, String callerEmail) {
        WorkoutPlan plan = planRepository.findById(planId)
                .orElseThrow(() -> new AppException("Plan not found", "الخطة غير موجودة", HttpStatus.NOT_FOUND));
        accessGuard.assertCanAccessMember(callerEmail, plan.getMemberId());
        return buildPlanDetail(plan);
    }

    @Transactional
    public ScheduleDay addDay(UUID planId, AddScheduleDayRequest req, String coachEmail) {
        assertCoachOwnsPlan(planId, coachEmail);
        return scheduleDayRepository.save(ScheduleDay.builder()
                .workoutPlanId(planId)
                .dayDate(req.getDayDate())
                .dayName(req.getDayName())
                .dayNameAr(req.getDayNameAr())
                .isRestDay(req.isRestDay())
                .build());
    }

    @Transactional
    public PlanExercise addExerciseToDay(UUID dayId, AddPlanExerciseRequest req, String coachEmail) {
        ScheduleDay day = scheduleDayRepository.findById(dayId)
                .orElseThrow(() -> new AppException("Day not found", "اليوم غير موجود", HttpStatus.NOT_FOUND));
        assertCoachOwnsPlan(day.getWorkoutPlanId(), coachEmail);

        int idx = req.getOrderIndex();
        if (idx == 0) {
            idx = planExerciseRepository.findByScheduleDayIdOrderByOrderIndex(dayId).size();
        }

        return planExerciseRepository.save(PlanExercise.builder()
                .scheduleDayId(dayId)
                .exerciseTemplateId(req.getExerciseTemplateId())
                .customName(req.getCustomName())
                .customNameAr(req.getCustomNameAr())
                .sets(req.getSets())
                .reps(req.getReps())
                .targetWeight(req.getTargetWeight())
                .videoUrl(req.getVideoUrl())
                .orderIndex(idx)
                .build());
    }

    @Transactional
    public ScheduleDay completeDay(UUID dayId, String memberEmail) {
        User member = accessGuard.loadUserByEmail(memberEmail);
        ScheduleDay day = scheduleDayRepository.findById(dayId)
                .orElseThrow(() -> new AppException("Day not found", "اليوم غير موجود", HttpStatus.NOT_FOUND));
        WorkoutPlan plan = planRepository.findById(day.getWorkoutPlanId())
                .orElseThrow(() -> new AppException("Plan not found", "الخطة غير موجودة", HttpStatus.NOT_FOUND));
        if (!plan.getMemberId().equals(member.getId())) {
            throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);
        }
        day.setCompleted(true);
        day.setCompletedAt(LocalDateTime.now());
        ScheduleDay saved = scheduleDayRepository.save(day);
        notificationService.create(
                member.getId(),
                com.qawi.entity.NotificationType.DAY_COMPLETED,
                "Great work! You completed today's workout 🔥",
                "أحسنت! أكملت تمرين اليوم 🔥"
        );
        return saved;
    }

    @Transactional
    public WorkoutLog logWorkout(LogWorkoutRequest req, String memberEmail) {
        User member = accessGuard.loadUserByEmail(memberEmail);
        PlanExercise exercise = planExerciseRepository.findById(req.getPlanExerciseId())
                .orElseThrow(() -> new AppException("Exercise not found", "التمرين غير موجود", HttpStatus.NOT_FOUND));
        ScheduleDay day = scheduleDayRepository.findById(exercise.getScheduleDayId())
                .orElseThrow(() -> new AppException("Day not found", "اليوم غير موجود", HttpStatus.NOT_FOUND));
        WorkoutPlan plan = planRepository.findById(day.getWorkoutPlanId())
                .orElseThrow(() -> new AppException("Plan not found", "الخطة غير موجودة", HttpStatus.NOT_FOUND));
        if (!plan.getMemberId().equals(member.getId())) {
            throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);
        }

        return logRepository.save(WorkoutLog.builder()
                .memberId(member.getId())
                .planExerciseId(req.getPlanExerciseId())
                .actualSets(req.getActualSets())
                .actualReps(req.getActualReps())
                .actualWeight(req.getActualWeight())
                .build());
    }

    @Transactional(readOnly = true)
    public List<WorkoutLog> getLogsByMember(UUID memberId, String callerEmail) {
        accessGuard.assertCanAccessMember(callerEmail, memberId);
        return logRepository.findByMemberIdOrderByLoggedAtDesc(memberId);
    }

    private Map<String, Object> buildPlanDetail(WorkoutPlan plan) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", plan.getId());
        result.put("name", plan.getName());
        result.put("coachId", plan.getCoachId());
        result.put("memberId", plan.getMemberId());
        result.put("startDate", plan.getStartDate());
        result.put("endDate", plan.getEndDate());
        result.put("createdAt", plan.getCreatedAt());

        List<ScheduleDay> days = scheduleDayRepository.findByWorkoutPlanIdOrderByDayDate(plan.getId());
        List<Map<String, Object>> dayList = days.stream().map(d -> {
            Map<String, Object> dm = new LinkedHashMap<>();
            dm.put("id", d.getId());
            dm.put("dayDate", d.getDayDate());
            dm.put("dayName", d.getDayName());
            dm.put("dayNameAr", d.getDayNameAr());
            dm.put("isRestDay", d.isRestDay());
            dm.put("isCompleted", d.isCompleted());
            dm.put("completedAt", d.getCompletedAt());
            dm.put("exercises", planExerciseRepository.findByScheduleDayIdOrderByOrderIndex(d.getId()));
            return dm;
        }).toList();

        result.put("days", dayList);
        return result;
    }

    @Transactional
    public void deletePlan(UUID planId, String coachEmail) {
        assertCoachOwnsPlan(planId, coachEmail);
        List<ScheduleDay> days = scheduleDayRepository.findByWorkoutPlanIdOrderByDayDate(planId);
        for (ScheduleDay d : days) {
            planExerciseRepository.deleteByScheduleDayId(d.getId());
        }
        scheduleDayRepository.deleteByWorkoutPlanId(planId);
        planRepository.deleteById(planId);
    }

    private WorkoutPlan assertCoachOwnsPlan(UUID planId, String coachEmail) {
        User coach = accessGuard.loadUserByEmail(coachEmail);
        WorkoutPlan plan = planRepository.findById(planId)
                .orElseThrow(() -> new AppException("Plan not found", "الخطة غير موجودة", HttpStatus.NOT_FOUND));
        if (!plan.getCoachId().equals(coach.getId())) {
            throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);
        }
        return plan;
    }
}
