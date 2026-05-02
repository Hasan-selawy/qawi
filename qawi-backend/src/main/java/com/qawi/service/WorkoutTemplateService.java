package com.qawi.service;

import com.qawi.dto.CreateTemplateRequest;
import com.qawi.entity.*;
import com.qawi.exception.AppException;
import com.qawi.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class WorkoutTemplateService {

    private final WorkoutTemplateRepository templateRepository;
    private final WorkoutTemplateDayRepository dayRepository;
    private final WorkoutTemplateDayExerciseRepository exerciseRepository;
    private final UserRepository userRepository;

    @Transactional
    public WorkoutTemplate createTemplate(CreateTemplateRequest req, String coachEmail) {
        User coach = getCoach(coachEmail);

        WorkoutTemplate template = templateRepository.save(WorkoutTemplate.builder()
                .coachId(coach.getId())
                .name(req.getName())
                .nameAr(req.getNameAr())
                .description(req.getDescription())
                .build());

        if (req.getDays() != null) {
            for (CreateTemplateRequest.TemplateDayRequest dayReq : req.getDays()) {
                WorkoutTemplateDay day = dayRepository.save(WorkoutTemplateDay.builder()
                        .templateId(template.getId())
                        .dayNumber(dayReq.getDayNumber())
                        .dayName(dayReq.getDayName())
                        .dayNameAr(dayReq.getDayNameAr())
                        .isRestDay(dayReq.isRestDay())
                        .build());

                if (dayReq.getExercises() != null) {
                    int idx = 0;
                    for (CreateTemplateRequest.TemplateDayExerciseRequest exReq : dayReq.getExercises()) {
                        exerciseRepository.save(WorkoutTemplateDayExercise.builder()
                                .templateDayId(day.getId())
                                .exerciseTemplateId(exReq.getExerciseTemplateId())
                                .customName(exReq.getCustomName())
                                .customNameAr(exReq.getCustomNameAr())
                                .sets(exReq.getSets())
                                .reps(exReq.getReps())
                                .targetWeight(exReq.getTargetWeight())
                                .videoUrl(exReq.getVideoUrl())
                                .orderIndex(idx++)
                                .build());
                    }
                }
            }
        }

        return template;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getTemplates(String coachEmail) {
        User coach = getCoach(coachEmail);
        List<WorkoutTemplate> templates = templateRepository.findByCoachId(coach.getId());
        return templates.stream().map(t -> buildTemplateDetail(t, true)).toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getTemplate(UUID templateId) {
        WorkoutTemplate template = templateRepository.findById(templateId)
                .orElseThrow(() -> new AppException("Template not found", "القالب غير موجود", HttpStatus.NOT_FOUND));
        return buildTemplateDetail(template, false);
    }

    @Transactional
    public void deleteTemplate(UUID templateId, String coachEmail) {
        User coach = getCoach(coachEmail);
        WorkoutTemplate template = templateRepository.findById(templateId)
                .orElseThrow(() -> new AppException("Template not found", "القالب غير موجود", HttpStatus.NOT_FOUND));

        if (!template.getCoachId().equals(coach.getId())) {
            throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);
        }

        List<WorkoutTemplateDay> days = dayRepository.findByTemplateIdOrderByDayNumber(templateId);
        for (WorkoutTemplateDay day : days) {
            exerciseRepository.deleteByTemplateDayId(day.getId());
        }
        dayRepository.deleteByTemplateId(templateId);
        templateRepository.delete(template);
    }

    private Map<String, Object> buildTemplateDetail(WorkoutTemplate t, boolean compact) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", t.getId());
        result.put("coachId", t.getCoachId());
        result.put("name", t.getName());
        result.put("nameAr", t.getNameAr());
        result.put("description", t.getDescription());
        result.put("createdAt", t.getCreatedAt());

        if (!compact) {
            List<WorkoutTemplateDay> days = dayRepository.findByTemplateIdOrderByDayNumber(t.getId());
            List<Map<String, Object>> dayList = days.stream().map(d -> {
                Map<String, Object> dm = new LinkedHashMap<>();
                dm.put("id", d.getId());
                dm.put("dayNumber", d.getDayNumber());
                dm.put("dayName", d.getDayName());
                dm.put("dayNameAr", d.getDayNameAr());
                dm.put("isRestDay", d.isRestDay());
                dm.put("exercises", exerciseRepository.findByTemplateDayIdOrderByOrderIndex(d.getId()));
                return dm;
            }).toList();
            result.put("days", dayList);
        }

        return result;
    }

    private User getCoach(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));
    }
}
