package com.qawi.service;

import com.qawi.dto.AddExerciseRequest;
import com.qawi.dto.ExerciseUsageResponse;
import com.qawi.entity.ExerciseCategory;
import com.qawi.entity.ExerciseScope;
import com.qawi.entity.ExerciseTemplate;
import com.qawi.entity.PlanExercise;
import com.qawi.entity.Role;
import com.qawi.entity.ScheduleDay;
import com.qawi.entity.User;
import com.qawi.entity.WorkoutLog;
import com.qawi.entity.WorkoutPlan;
import com.qawi.exception.AppException;
import com.qawi.repository.ExerciseCategoryRepository;
import com.qawi.repository.ExerciseTemplateRepository;
import com.qawi.repository.PlanExerciseRepository;
import com.qawi.repository.UserRepository;
import com.qawi.repository.WorkoutLogRepository;
import com.qawi.repository.WorkoutTemplateDayExerciseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ExerciseService {

    private final ExerciseCategoryRepository categoryRepository;
    private final ExerciseTemplateRepository templateRepository;
    private final UserRepository userRepository;
    private final PlanExerciseRepository planExerciseRepository;
    private final WorkoutTemplateDayExerciseRepository workoutTemplateDayExerciseRepository;
    private final WorkoutLogRepository workoutLogRepository;

    public List<ExerciseCategory> getAllCategories() {
        return categoryRepository.findAll();
    }

    // ── Library reads (scope-aware) ─────────────────────────────────────────

    public List<ExerciseTemplate> getAllExercises(String userEmail) {
        User user = requireUser(userEmail);
        return switch (user.getRole()) {
            case SUPER_ADMIN -> templateRepository.findAll();
            case GYM_ADMIN   -> templateRepository.findVisibleForGymAdmin(user.getGymId());
            case COACH       -> templateRepository.findVisibleForCoach(user.getGymId(), user.getId());
            default          -> templateRepository.findByIsCustomFalse();
        };
    }

    public List<ExerciseTemplate> getExercisesByCategory(UUID categoryId, String userEmail) {
        categoryRepository.findById(categoryId)
                .orElseThrow(() -> new AppException("Category not found", "التصنيف غير موجود", HttpStatus.NOT_FOUND));
        return getAllExercises(userEmail).stream()
                .filter(e -> categoryId.equals(e.getCategoryId()))
                .toList();
    }

    // ── Library writes (scope routed by role) ───────────────────────────────

    @Transactional
    public ExerciseTemplate addCustomExercise(AddExerciseRequest req, String userEmail) {
        User user = requireUser(userEmail);

        categoryRepository.findById(req.getCategoryId())
                .orElseThrow(() -> new AppException("Category not found", "التصنيف غير موجود", HttpStatus.NOT_FOUND));

        ExerciseScope scope;
        UUID gymId;
        UUID createdByCoach;
        boolean isCustomFlag;

        switch (user.getRole()) {
            case SUPER_ADMIN -> {
                scope = ExerciseScope.GLOBAL;
                gymId = null;
                createdByCoach = null;
                isCustomFlag = false; // GLOBAL rows behave like built-ins
            }
            case GYM_ADMIN -> {
                if (user.getGymId() == null) {
                    throw new AppException("Admin has no gym assigned", "المدير غير مرتبط بصالة", HttpStatus.BAD_REQUEST);
                }
                scope = ExerciseScope.GYM;
                gymId = user.getGymId();
                createdByCoach = null;
                isCustomFlag = true;
            }
            case COACH -> {
                scope = ExerciseScope.COACH;
                gymId = user.getGymId(); // informational, helps gym-admin visibility
                createdByCoach = user.getId();
                isCustomFlag = true;
            }
            default -> throw new AppException(
                    "Members cannot add exercises",
                    "الأعضاء لا يمكنهم إضافة تمارين",
                    HttpStatus.FORBIDDEN);
        }

        return templateRepository.save(ExerciseTemplate.builder()
                .categoryId(req.getCategoryId())
                .name(req.getName())
                .nameAr(req.getNameAr())
                .defaultSets(req.getDefaultSets())
                .defaultReps(req.getDefaultReps())
                .defaultWeight(req.getDefaultWeight())
                .videoUrl(req.getVideoUrl())
                .imageUrl(req.getImageUrl())
                .isCustom(isCustomFlag)
                .createdByCoachId(createdByCoach)
                .scope(scope)
                .gymId(gymId)
                .build());
    }

    @Transactional
    public ExerciseTemplate updateCustomExercise(UUID exerciseId, AddExerciseRequest req, String userEmail) {
        User user = requireUser(userEmail);

        ExerciseTemplate ex = templateRepository.findById(exerciseId)
                .orElseThrow(() -> new AppException("Exercise not found", "التمرين غير موجود", HttpStatus.NOT_FOUND));

        assertCanModify(user, ex);

        categoryRepository.findById(req.getCategoryId())
                .orElseThrow(() -> new AppException("Category not found", "التصنيف غير موجود", HttpStatus.NOT_FOUND));

        ex.setCategoryId(req.getCategoryId());
        ex.setName(req.getName());
        ex.setNameAr(req.getNameAr());
        ex.setDefaultSets(req.getDefaultSets());
        ex.setDefaultReps(req.getDefaultReps());
        ex.setDefaultWeight(req.getDefaultWeight());
        ex.setVideoUrl(req.getVideoUrl());
        ex.setImageUrl(req.getImageUrl());
        return templateRepository.save(ex);
    }

    private void assertCanModify(User user, ExerciseTemplate ex) {
        switch (user.getRole()) {
            case SUPER_ADMIN -> {
                // can modify anything
            }
            case GYM_ADMIN -> {
                if (ex.getScope() != ExerciseScope.GYM
                        || ex.getGymId() == null
                        || !ex.getGymId().equals(user.getGymId())) {
                    throw new AppException(
                            "You can only modify exercises owned by your gym",
                            "يمكنك تعديل تمارين صالتك فقط",
                            HttpStatus.FORBIDDEN);
                }
            }
            case COACH -> {
                if (ex.getScope() != ExerciseScope.COACH
                        || ex.getCreatedByCoachId() == null
                        || !ex.getCreatedByCoachId().equals(user.getId())) {
                    throw new AppException(
                            "You can only modify your own custom exercises",
                            "يمكنك تعديل تمارينك المخصصة فقط",
                            HttpStatus.FORBIDDEN);
                }
            }
            default -> throw new AppException("Not allowed", "غير مسموح", HttpStatus.FORBIDDEN);
        }
    }

    @Transactional
    public void deleteCustomExercise(UUID exerciseId, String userEmail) {
        User user = requireUser(userEmail);

        ExerciseTemplate ex = templateRepository.findById(exerciseId)
                .orElseThrow(() -> new AppException("Exercise not found", "التمرين غير موجود", HttpStatus.NOT_FOUND));

        // Ownership check by role/scope
        switch (user.getRole()) {
            case SUPER_ADMIN -> {
                // can delete anything
            }
            case GYM_ADMIN -> {
                // Gym admins may delete GYM-scope and COACH-scope rows that
                // belong to their gym (gymId is stamped on COACH rows too).
                boolean inMyGym = ex.getGymId() != null
                        && ex.getGymId().equals(user.getGymId());
                boolean okScope = ex.getScope() == ExerciseScope.GYM
                        || ex.getScope() == ExerciseScope.COACH;
                if (!okScope || !inMyGym) {
                    throw new AppException(
                            "You can only delete exercises owned by your gym",
                            "يمكنك حذف تمارين صالتك فقط",
                            HttpStatus.FORBIDDEN);
                }
            }
            case COACH -> {
                if (ex.getScope() != ExerciseScope.COACH
                        || ex.getCreatedByCoachId() == null
                        || !ex.getCreatedByCoachId().equals(user.getId())) {
                    throw new AppException(
                            "You can only delete your own custom exercises",
                            "يمكنك حذف تمارينك المخصصة فقط",
                            HttpStatus.FORBIDDEN);
                }
            }
            default -> throw new AppException(
                    "Not allowed",
                    "غير مسموح",
                    HttpStatus.FORBIDDEN);
        }

        // Cascade: drop logs → plan_exercises → template_day_exercises
        // This honors the spec "remove it from all plans using it".
        List<PlanExercise> usages = planExerciseRepository.findByExerciseTemplateId(exerciseId);
        if (!usages.isEmpty()) {
            List<UUID> peIds = usages.stream().map(PlanExercise::getId).toList();
            workoutLogRepository.deleteByPlanExerciseIdIn(peIds);
            planExerciseRepository.deleteByExerciseTemplateId(exerciseId);
        }
        workoutTemplateDayExerciseRepository.deleteByExerciseTemplateId(exerciseId);

        templateRepository.delete(ex);
    }

    // ── Usage (who is using this exercise) ──────────────────────────────────

    public List<ExerciseUsageResponse> getExerciseUsage(UUID exerciseId, String userEmail) {
        User user = requireUser(userEmail);

        // Existence guard (keeps the 404 contract).
        templateRepository.findById(exerciseId)
                .orElseThrow(() -> new AppException("Exercise not found", "التمرين غير موجود", HttpStatus.NOT_FOUND));

        // Members are not allowed to query usage at all.
        if (user.getRole() == Role.MEMBER) {
            throw new AppException("Not allowed", "غير مسموح", HttpStatus.FORBIDDEN);
        }

        // Visibility filter is enforced in SQL via :role + :scopeId — no
        // cross-tenant rows are ever loaded into application memory.
        UUID scopeId = switch (user.getRole()) {
            case COACH     -> user.getId();
            case GYM_ADMIN -> user.getGymId();
            default        -> null; // SUPER_ADMIN ignores :scopeId
        };

        List<Object[]> rows = planExerciseRepository.findUsageRows(
                exerciseId, user.getRole().name(), scopeId);
        if (rows.isEmpty()) return List.of();

        // Batch-fetch latest log per plan_exercise (1 query, not N).
        List<UUID> peIds = rows.stream()
                .map(r -> ((PlanExercise) r[0]).getId())
                .toList();
        java.util.Map<UUID, WorkoutLog> latestByPeId = new java.util.HashMap<>();
        for (WorkoutLog log : workoutLogRepository.findByPlanExerciseIdInOrderByLoggedAtDesc(peIds)) {
            latestByPeId.putIfAbsent(log.getPlanExerciseId(), log);
        }

        List<ExerciseUsageResponse> out = new ArrayList<>(rows.size());
        for (Object[] r : rows) {
            PlanExercise pe = (PlanExercise) r[0];
            ScheduleDay day = (ScheduleDay) r[1];
            WorkoutPlan plan = (WorkoutPlan) r[2];
            String memberName = (String) r[3];
            WorkoutLog latest = latestByPeId.get(pe.getId());

            out.add(ExerciseUsageResponse.builder()
                    .memberId(plan.getMemberId())
                    .memberName(memberName != null ? memberName : "Unknown")
                    .planId(plan.getId())
                    .planName(plan.getName())
                    .dayId(day.getId())
                    .dayName(day.getDayName())
                    .dayDate(day.getDayDate())
                    .sets(pe.getSets())
                    .reps(pe.getReps())
                    .lastLoggedAt(latest != null ? latest.getLoggedAt() : null)
                    .lastWeight(latest != null ? latest.getActualWeight() : null)
                    .build());
        }
        return out;
    }

    private User requireUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));
    }
}
