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
    private final UserRepository userRepository;

    @Transactional
    public WorkoutPlan createPlan(CreateWorkoutPlanRequest req, String coachEmail) {
        User coach = getUser(coachEmail);
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
        User coach = getUser(coachEmail);

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
    public List<WorkoutPlan> getPlansByMember(UUID memberId) {
        return planRepository.findByMemberId(memberId);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getPlanDetail(UUID planId) {
        WorkoutPlan plan = planRepository.findById(planId)
                .orElseThrow(() -> new AppException("Plan not found", "الخطة غير موجودة", HttpStatus.NOT_FOUND));
        return buildPlanDetail(plan);
    }

    @Transactional
    public ScheduleDay addDay(UUID planId, AddScheduleDayRequest req, String coachEmail) {
        planRepository.findById(planId)
                .orElseThrow(() -> new AppException("Plan not found", "الخطة غير موجودة", HttpStatus.NOT_FOUND));
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
        scheduleDayRepository.findById(dayId)
                .orElseThrow(() -> new AppException("Day not found", "اليوم غير موجود", HttpStatus.NOT_FOUND));

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
        ScheduleDay day = scheduleDayRepository.findById(dayId)
                .orElseThrow(() -> new AppException("Day not found", "اليوم غير موجود", HttpStatus.NOT_FOUND));
        day.setCompleted(true);
        day.setCompletedAt(LocalDateTime.now());
        return scheduleDayRepository.save(day);
    }

    @Transactional
    public WorkoutLog logWorkout(LogWorkoutRequest req, String memberEmail) {
        User member = getUser(memberEmail);
        planExerciseRepository.findById(req.getPlanExerciseId())
                .orElseThrow(() -> new AppException("Exercise not found", "التمرين غير موجود", HttpStatus.NOT_FOUND));

        return logRepository.save(WorkoutLog.builder()
                .memberId(member.getId())
                .planExerciseId(req.getPlanExerciseId())
                .actualSets(req.getActualSets())
                .actualReps(req.getActualReps())
                .actualWeight(req.getActualWeight())
                .build());
    }

    @Transactional(readOnly = true)
    public List<WorkoutLog> getLogsByMember(UUID memberId) {
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

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));
    }
}
