package com.qawi.service;

import com.qawi.dto.*;
import com.qawi.entity.*;
import com.qawi.entity.Role;
import com.qawi.exception.AppException;
import com.qawi.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

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
    private final ExerciseTemplateRepository exerciseTemplateRepository;
    private final NotificationService notificationService;
    private final AccessGuard accessGuard;

    @Transactional
    public WorkoutPlan createPlan(CreateWorkoutPlanRequest req, String callerEmail) {
        User caller = accessGuard.loadUserByEmail(callerEmail);
        if (caller.getRole() == Role.MEMBER) {
            if (!caller.isSelfTrainingEnabled()) {
                throw new AppException(
                        "Self-training is not enabled for your account",
                        "لم يتم تفعيل التدريب الذاتي لحسابك",
                        HttpStatus.FORBIDDEN);
            }
            return planRepository.save(WorkoutPlan.builder()
                    .name(req.getName())
                    .coachId(null)
                    .memberId(caller.getId())
                    .startDate(req.getStartDate())
                    .endDate(req.getEndDate())
                    .build());
        }
        accessGuard.assertCoachManagesMember(callerEmail, req.getMemberId());
        return planRepository.save(WorkoutPlan.builder()
                .name(req.getName())
                .coachId(caller.getId())
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
    public ScheduleDay addDay(UUID planId, AddScheduleDayRequest req, String callerEmail) {
        assertCallerCanWritePlan(planId, callerEmail);
        return scheduleDayRepository.save(ScheduleDay.builder()
                .workoutPlanId(planId)
                .dayDate(req.getDayDate())
                .dayName(req.getDayName())
                .dayNameAr(req.getDayNameAr())
                .isRestDay(req.isRestDay())
                .build());
    }

    @Transactional
    public PlanExercise addExerciseToDay(UUID dayId, AddPlanExerciseRequest req, String callerEmail) {
        ScheduleDay day = scheduleDayRepository.findById(dayId)
                .orElseThrow(() -> new AppException("Day not found", "اليوم غير موجود", HttpStatus.NOT_FOUND));
        assertCallerCanWritePlan(day.getWorkoutPlanId(), callerEmail);

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
    public void removeExerciseFromDay(UUID dayId, UUID planExerciseId, String callerEmail) {
        ScheduleDay day = scheduleDayRepository.findById(dayId)
                .orElseThrow(() -> new AppException("Day not found", "اليوم غير موجود", HttpStatus.NOT_FOUND));
        assertCallerCanWritePlan(day.getWorkoutPlanId(), callerEmail);
        PlanExercise ex = planExerciseRepository.findById(planExerciseId)
                .orElseThrow(() -> new AppException("Exercise not found", "التمرين غير موجود", HttpStatus.NOT_FOUND));
        if (!ex.getScheduleDayId().equals(dayId)) {
            throw new AppException("Exercise does not belong to this day", "التمرين لا ينتمي لهذا اليوم", HttpStatus.BAD_REQUEST);
        }
        logRepository.deleteByPlanExerciseIdIn(java.util.List.of(planExerciseId));
        planExerciseRepository.deleteById(planExerciseId);
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
    public void deletePlan(UUID planId, String callerEmail) {
        assertCallerCanWritePlan(planId, callerEmail);
        List<ScheduleDay> days = scheduleDayRepository.findByWorkoutPlanIdOrderByDayDate(planId);
        for (ScheduleDay d : days) {
            planExerciseRepository.deleteByScheduleDayId(d.getId());
        }
        scheduleDayRepository.deleteByWorkoutPlanId(planId);
        planRepository.deleteById(planId);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getMemberHistory(UUID memberId, String callerEmail) {
        accessGuard.assertCanAccessMember(callerEmail, memberId);
        return buildMemberHistory(memberId);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getMemberHistoryAsSelf(UUID memberId) {
        return buildMemberHistory(memberId);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getExerciseHistory(UUID exerciseTemplateId, UUID memberId, String callerEmail) {
        accessGuard.assertCanAccessMember(callerEmail, memberId);
        return buildExerciseHistory(exerciseTemplateId, memberId);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getExerciseHistoryAsSelf(UUID exerciseTemplateId, UUID memberId) {
        return buildExerciseHistory(exerciseTemplateId, memberId);
    }

    private List<Map<String, Object>> buildMemberHistory(UUID memberId) {
        List<UUID> planIds = planRepository.findByMemberId(memberId)
                .stream().map(WorkoutPlan::getId).toList();
        if (planIds.isEmpty()) return List.of();

        List<ScheduleDay> completedDays =
                scheduleDayRepository.findByWorkoutPlanIdInAndIsCompletedTrueOrderByCompletedAtDesc(planIds);
        if (completedDays.isEmpty()) return List.of();

        List<WorkoutLog> allLogs = logRepository.findByMemberIdOrderByLoggedAtDesc(memberId);

        // Group all logs by planExerciseId (keep every set entry)
        Map<UUID, List<WorkoutLog>> logsByPlanExercise = new LinkedHashMap<>();
        allLogs.forEach(l -> logsByPlanExercise.computeIfAbsent(l.getPlanExerciseId(), k -> new ArrayList<>()).add(l));

        // Best weight per exerciseTemplateId for PR detection
        Map<UUID, Double> bestWeightByTemplate = new HashMap<>();
        allLogs.forEach(l -> {
            PlanExercise pe = planExerciseRepository.findById(l.getPlanExerciseId()).orElse(null);
            if (pe != null && pe.getExerciseTemplateId() != null) {
                bestWeightByTemplate.merge(pe.getExerciseTemplateId(), l.getActualWeight(), Math::max);
            }
        });

        List<Map<String, Object>> result = new ArrayList<>();
        for (ScheduleDay day : completedDays) {
            List<PlanExercise> exercises = planExerciseRepository.findByScheduleDayIdOrderByOrderIndex(day.getId());

            Set<UUID> templateIds = exercises.stream()
                    .filter(e -> e.getExerciseTemplateId() != null)
                    .map(PlanExercise::getExerciseTemplateId)
                    .collect(Collectors.toSet());
            Map<UUID, ExerciseTemplate> templateMap = exerciseTemplateRepository.findAllById(templateIds)
                    .stream().collect(Collectors.toMap(ExerciseTemplate::getId, t -> t));

            List<Map<String, Object>> exList = new ArrayList<>();
            for (PlanExercise pe : exercises) {
                Map<String, Object> em = new LinkedHashMap<>();
                em.put("planExerciseId", pe.getId());
                em.put("exerciseTemplateId", pe.getExerciseTemplateId());

                String name = pe.getCustomName();
                String nameAr = pe.getCustomNameAr();
                ExerciseTemplate tmpl = pe.getExerciseTemplateId() != null ? templateMap.get(pe.getExerciseTemplateId()) : null;
                if (name == null && tmpl != null) name = tmpl.getName();
                if (nameAr == null && tmpl != null) nameAr = tmpl.getNameAr();

                em.put("exerciseName", name);
                em.put("exerciseNameAr", nameAr);
                em.put("targetSets", pe.getSets());
                em.put("targetReps", pe.getReps());
                em.put("targetWeight", pe.getTargetWeight());

                // All log entries for this exercise, sorted chronologically (set 1 → last set)
                List<WorkoutLog> exerciseLogs = logsByPlanExercise.getOrDefault(pe.getId(), List.of())
                        .stream().sorted(Comparator.comparing(WorkoutLog::getLoggedAt)).toList();

                List<Map<String, Object>> sets = new ArrayList<>();
                for (int si = 0; si < exerciseLogs.size(); si++) {
                    WorkoutLog sl = exerciseLogs.get(si);
                    Map<String, Object> sm = new LinkedHashMap<>();
                    sm.put("setNumber", si + 1);
                    sm.put("actualWeight", sl.getActualWeight());
                    sm.put("actualReps", sl.getActualReps());
                    sm.put("loggedAt", sl.getLoggedAt());
                    sets.add(sm);
                }
                em.put("sets", sets);

                if (!exerciseLogs.isEmpty()) {
                    double maxWeight = exerciseLogs.stream().mapToDouble(WorkoutLog::getActualWeight).max().orElse(0);
                    em.put("actualSets", exerciseLogs.size());
                    em.put("actualReps", exerciseLogs.get(0).getActualReps());
                    em.put("actualWeight", maxWeight);
                    em.put("loggedAt", exerciseLogs.get(exerciseLogs.size() - 1).getLoggedAt());
                    boolean isPR = pe.getExerciseTemplateId() != null
                            && bestWeightByTemplate.getOrDefault(pe.getExerciseTemplateId(), 0.0) <= maxWeight;
                    em.put("isPersonalBest", isPR);
                } else {
                    em.put("isPersonalBest", false);
                }
                exList.add(em);
            }

            Map<String, Object> dm = new LinkedHashMap<>();
            dm.put("dayId", day.getId());
            dm.put("dayName", day.getDayName());
            dm.put("dayNameAr", day.getDayNameAr());
            dm.put("date", day.getDayDate());
            dm.put("completedAt", day.getCompletedAt());
            dm.put("exercises", exList);
            result.add(dm);
        }
        return result;
    }

    private List<Map<String, Object>> buildExerciseHistory(UUID exerciseTemplateId, UUID memberId) {
        List<UUID> planExerciseIds = planExerciseRepository.findByExerciseTemplateId(exerciseTemplateId)
                .stream().map(PlanExercise::getId).toList();
        if (planExerciseIds.isEmpty()) return List.of();

        return logRepository.findByMemberIdAndPlanExerciseIdInOrderByLoggedAtDesc(memberId, planExerciseIds)
                .stream().map(log -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("date", log.getLoggedAt().toLocalDate());
                    m.put("actualWeight", log.getActualWeight());
                    m.put("actualSets", log.getActualSets());
                    m.put("actualReps", log.getActualReps());
                    m.put("loggedAt", log.getLoggedAt());
                    return (Map<String, Object>) m;
                }).toList();
    }

    @Transactional
    public void uncompleteDay(UUID dayId, String coachEmail) {
        ScheduleDay day = scheduleDayRepository.findById(dayId)
                .orElseThrow(() -> new AppException("Day not found", "اليوم غير موجود", HttpStatus.NOT_FOUND));
        assertCallerCanWritePlan(day.getWorkoutPlanId(), coachEmail);

        List<UUID> planExerciseIds = planExerciseRepository.findByScheduleDayIdOrderByOrderIndex(dayId)
                .stream().map(PlanExercise::getId).toList();
        if (!planExerciseIds.isEmpty()) {
            logRepository.deleteByPlanExerciseIdIn(planExerciseIds);
        }

        day.setCompleted(false);
        day.setCompletedAt(null);
        scheduleDayRepository.save(day);
    }

    private WorkoutPlan assertCallerCanWritePlan(UUID planId, String callerEmail) {
        User caller = accessGuard.loadUserByEmail(callerEmail);
        WorkoutPlan plan = planRepository.findById(planId)
                .orElseThrow(() -> new AppException("Plan not found", "الخطة غير موجودة", HttpStatus.NOT_FOUND));
        if (caller.getRole() == Role.MEMBER) {
            if (!caller.isSelfTrainingEnabled() || !plan.getMemberId().equals(caller.getId())) {
                throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);
            }
        } else {
            if (plan.getCoachId() == null || !plan.getCoachId().equals(caller.getId())) {
                throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);
            }
        }
        return plan;
    }
}
