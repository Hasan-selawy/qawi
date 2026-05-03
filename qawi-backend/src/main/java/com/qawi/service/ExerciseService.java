package com.qawi.service;

import com.qawi.dto.AddExerciseRequest;
import com.qawi.entity.ExerciseCategory;
import com.qawi.entity.ExerciseScope;
import com.qawi.entity.ExerciseTemplate;
import com.qawi.entity.Role;
import com.qawi.entity.User;
import com.qawi.exception.AppException;
import com.qawi.repository.ExerciseCategoryRepository;
import com.qawi.repository.ExerciseTemplateRepository;
import com.qawi.repository.PlanExerciseRepository;
import com.qawi.repository.UserRepository;
import com.qawi.repository.WorkoutTemplateDayExerciseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
                .isCustom(isCustomFlag)
                .createdByCoachId(createdByCoach)
                .scope(scope)
                .gymId(gymId)
                .build());
    }

    @Transactional
    public void deleteCustomExercise(UUID exerciseId, String userEmail) {
        User user = requireUser(userEmail);

        ExerciseTemplate ex = templateRepository.findById(exerciseId)
                .orElseThrow(() -> new AppException("Exercise not found", "التمرين غير موجود", HttpStatus.NOT_FOUND));

        // Ownership check by role/scope
        switch (user.getRole()) {
            case SUPER_ADMIN -> {
                // can delete anything except in-use rows (handled below)
            }
            case GYM_ADMIN -> {
                if (ex.getScope() != ExerciseScope.GYM
                        || ex.getGymId() == null
                        || !ex.getGymId().equals(user.getGymId())) {
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

        if (planExerciseRepository.existsByExerciseTemplateId(exerciseId)
                || workoutTemplateDayExerciseRepository.existsByExerciseTemplateId(exerciseId)) {
            throw new AppException(
                    "Exercise is in use by an existing plan or template",
                    "هذا التمرين مستخدم في خطة أو قالب موجود",
                    HttpStatus.CONFLICT);
        }

        templateRepository.delete(ex);
    }

    private User requireUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));
    }
}
