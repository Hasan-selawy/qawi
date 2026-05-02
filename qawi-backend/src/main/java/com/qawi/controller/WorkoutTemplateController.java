package com.qawi.controller;

import com.qawi.dto.CreateTemplateRequest;
import com.qawi.entity.WorkoutTemplate;
import com.qawi.service.WorkoutTemplateService;
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
@RequestMapping("/api/v1/templates")
@RequiredArgsConstructor
public class WorkoutTemplateController {

    private final WorkoutTemplateService templateService;

    @PostMapping
    @PreAuthorize("hasRole('COACH')")
    public ResponseEntity<WorkoutTemplate> createTemplate(
            @Valid @RequestBody CreateTemplateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(templateService.createTemplate(request, userDetails.getUsername()));
    }

    @GetMapping
    @PreAuthorize("hasRole('COACH')")
    public ResponseEntity<List<Map<String, Object>>> getMyTemplates(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(templateService.getTemplates(userDetails.getUsername()));
    }

    @GetMapping("/{templateId}")
    public ResponseEntity<Map<String, Object>> getTemplate(@PathVariable UUID templateId) {
        return ResponseEntity.ok(templateService.getTemplate(templateId));
    }

    @DeleteMapping("/{templateId}")
    @PreAuthorize("hasRole('COACH')")
    public ResponseEntity<Void> deleteTemplate(
            @PathVariable UUID templateId,
            @AuthenticationPrincipal UserDetails userDetails) {
        templateService.deleteTemplate(templateId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }
}
