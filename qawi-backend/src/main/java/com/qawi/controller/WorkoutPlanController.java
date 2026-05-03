package com.qawi.controller;

import com.qawi.dto.*;
import com.qawi.entity.*;
import com.qawi.service.WorkoutPlanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/workouts")
@RequiredArgsConstructor
public class WorkoutPlanController {

    private final WorkoutPlanService workoutPlanService;

    @PostMapping
    @PreAuthorize("hasRole('COACH')")
    public ResponseEntity<WorkoutPlan> createPlan(
            @Valid @RequestBody CreateWorkoutPlanRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(workoutPlanService.createPlan(request, userDetails.getUsername()));
    }

    @PostMapping("/from-template")
    @PreAuthorize("hasRole('COACH')")
    public ResponseEntity<Map<String, Object>> createFromTemplate(
            @Valid @RequestBody CreateFromTemplateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(workoutPlanService.createFromTemplate(request, userDetails.getUsername()));
    }

    @GetMapping("/member/{memberId}")
    public ResponseEntity<List<WorkoutPlan>> getPlansByMember(
            @PathVariable UUID memberId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(workoutPlanService.getPlansByMember(memberId, userDetails.getUsername()));
    }

    @GetMapping("/{planId}")
    public ResponseEntity<Map<String, Object>> getPlanDetail(
            @PathVariable UUID planId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(workoutPlanService.getPlanDetail(planId, userDetails.getUsername()));
    }

    @PostMapping("/{planId}/days")
    @PreAuthorize("hasRole('COACH')")
    public ResponseEntity<ScheduleDay> addDay(
            @PathVariable UUID planId,
            @Valid @RequestBody AddScheduleDayRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(workoutPlanService.addDay(planId, request, userDetails.getUsername()));
    }

    @PostMapping("/days/{dayId}/exercises")
    @PreAuthorize("hasRole('COACH')")
    public ResponseEntity<PlanExercise> addExerciseToDay(
            @PathVariable UUID dayId,
            @RequestBody AddPlanExerciseRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(workoutPlanService.addExerciseToDay(dayId, request, userDetails.getUsername()));
    }

    @PutMapping("/days/{dayId}/complete")
    @PreAuthorize("hasRole('MEMBER')")
    public ResponseEntity<ScheduleDay> completeDay(
            @PathVariable UUID dayId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(workoutPlanService.completeDay(dayId, userDetails.getUsername()));
    }

    @PostMapping("/logs")
    @PreAuthorize("hasRole('MEMBER')")
    public ResponseEntity<WorkoutLog> logWorkout(
            @Valid @RequestBody LogWorkoutRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(workoutPlanService.logWorkout(request, userDetails.getUsername()));
    }

    @DeleteMapping("/{planId}")
    @PreAuthorize("hasRole('COACH')")
    public ResponseEntity<Void> deletePlan(
            @PathVariable UUID planId,
            @AuthenticationPrincipal UserDetails userDetails) {
        workoutPlanService.deletePlan(planId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/logs/member/{memberId}")
    public ResponseEntity<List<WorkoutLog>> getLogsByMember(
            @PathVariable UUID memberId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(workoutPlanService.getLogsByMember(memberId, userDetails.getUsername()));
    }
}
