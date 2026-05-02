package com.qawi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class CreateTemplateRequest {
    @NotBlank private String name;
    @NotBlank private String nameAr;
    private String description;
    @NotNull private List<TemplateDayRequest> days;

    @Data
    public static class TemplateDayRequest {
        private int dayNumber;
        @NotBlank private String dayName;
        @NotBlank private String dayNameAr;
        private boolean isRestDay = false;
        private List<TemplateDayExerciseRequest> exercises;
    }

    @Data
    public static class TemplateDayExerciseRequest {
        private java.util.UUID exerciseTemplateId;
        private String customName;
        private String customNameAr;
        private int sets = 3;
        private int reps = 10;
        private double targetWeight = 0;
        private String videoUrl;
    }
}
