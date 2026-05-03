package com.qawi.service;

import com.qawi.dto.AddExerciseRequest;
import com.qawi.entity.ExerciseCategory;
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

    public List<ExerciseTemplate> getAllExercises(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));
        if (user.getRole() == Role.COACH) {
            return templateRepository.findByIsCustomFalseOrCreatedByCoachId(user.getId());
        }
        return templateRepository.findByIsCustomFalse();
    }

    public List<ExerciseTemplate> getExercisesByCategory(UUID categoryId, String userEmail) {
        categoryRepository.findById(categoryId)
                .orElseThrow(() -> new AppException("Category not found", "التصنيف غير موجود", HttpStatus.NOT_FOUND));
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));
        if (user.getRole() == Role.COACH) {
            return templateRepository.findByCategoryIdAndIsCustomFalseOrCategoryIdAndCreatedByCoachId(
                    categoryId, categoryId, user.getId());
        }
        return templateRepository.findByCategoryIdAndIsCustomFalse(categoryId);
    }

    @Transactional
    public ExerciseTemplate addCustomExercise(AddExerciseRequest req, String coachEmail) {
        User coach = userRepository.findByEmail(coachEmail)
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));

        if (coach.getRole() != Role.COACH) {
            throw new AppException("Only coaches can add exercises", "فقط المدربون يمكنهم إضافة تمارين", HttpStatus.FORBIDDEN);
        }

        categoryRepository.findById(req.getCategoryId())
                .orElseThrow(() -> new AppException("Category not found", "التصنيف غير موجود", HttpStatus.NOT_FOUND));

        return templateRepository.save(ExerciseTemplate.builder()
                .categoryId(req.getCategoryId())
                .name(req.getName())
                .nameAr(req.getNameAr())
                .defaultSets(req.getDefaultSets())
                .defaultReps(req.getDefaultReps())
                .defaultWeight(req.getDefaultWeight())
                .videoUrl(req.getVideoUrl())
                .isCustom(true)
                .createdByCoachId(coach.getId())
                .build());
    }

    @Transactional
    public void deleteCustomExercise(UUID exerciseId, String coachEmail) {
        User coach = userRepository.findByEmail(coachEmail)
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));

        if (coach.getRole() != Role.COACH) {
            throw new AppException("Only coaches can delete exercises", "فقط المدربون يمكنهم حذف التمارين", HttpStatus.FORBIDDEN);
        }

        ExerciseTemplate ex = templateRepository.findById(exerciseId)
                .orElseThrow(() -> new AppException("Exercise not found", "التمرين غير موجود", HttpStatus.NOT_FOUND));

        if (!ex.isCustom()) {
            throw new AppException("Cannot delete built-in exercises", "لا يمكن حذف التمارين الأساسية", HttpStatus.FORBIDDEN);
        }

        if (ex.getCreatedByCoachId() == null || !ex.getCreatedByCoachId().equals(coach.getId())) {
            throw new AppException("You can only delete your own custom exercises", "يمكنك حذف تمارينك المخصصة فقط", HttpStatus.FORBIDDEN);
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
}
