package com.qawi.service;

import com.qawi.dto.AddExerciseRequest;
import com.qawi.entity.ExerciseCategory;
import com.qawi.entity.ExerciseTemplate;
import com.qawi.entity.Role;
import com.qawi.entity.User;
import com.qawi.exception.AppException;
import com.qawi.repository.ExerciseCategoryRepository;
import com.qawi.repository.ExerciseTemplateRepository;
import com.qawi.repository.UserRepository;
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
}
