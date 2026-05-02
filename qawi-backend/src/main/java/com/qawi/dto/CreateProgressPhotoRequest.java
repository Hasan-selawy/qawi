package com.qawi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CreateProgressPhotoRequest {
    @NotBlank private String photoUrl;
    private String caption;
    @NotNull private LocalDate takenAt;
}
