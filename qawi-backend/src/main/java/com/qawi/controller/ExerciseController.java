package com.qawi.controller;

import com.qawi.dto.AddExerciseRequest;
import com.qawi.entity.ExerciseCategory;
import com.qawi.entity.ExerciseTemplate;
import com.qawi.service.ExerciseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/exercises")
@RequiredArgsConstructor
public class ExerciseController {

    private final ExerciseService exerciseService;

    @GetMapping("/categories")
    public ResponseEntity<List<ExerciseCategory>> getCategories() {
        return ResponseEntity.ok(exerciseService.getAllCategories());
    }

    @GetMapping("/library")
    public ResponseEntity<List<ExerciseTemplate>> getAllExercises(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(exerciseService.getAllExercises(userDetails.getUsername()));
    }

    @GetMapping("/library/{categoryId}")
    public ResponseEntity<List<ExerciseTemplate>> getByCategory(
            @PathVariable UUID categoryId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(exerciseService.getExercisesByCategory(categoryId, userDetails.getUsername()));
    }

    @PostMapping("/library")
    @PreAuthorize("hasRole('COACH')")
    public ResponseEntity<ExerciseTemplate> addExercise(
            @Valid @RequestBody AddExerciseRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(exerciseService.addCustomExercise(request, userDetails.getUsername()));
    }
}
