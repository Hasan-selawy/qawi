package com.qawi.controller;

import com.qawi.dto.*;
import com.qawi.service.GymLeadService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/super/leads")
@PreAuthorize("hasRole('SUPER_ADMIN')")
@RequiredArgsConstructor
public class SuperAdminSalesController {

    private final GymLeadService gymLeadService;

    @GetMapping
    public ResponseEntity<List<GymLeadResponse>> getLeads(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String city) {
        return ResponseEntity.ok(gymLeadService.getAllLeads(status, city));
    }

    @PostMapping
    public ResponseEntity<GymLeadResponse> createLead(@Valid @RequestBody GymLeadCreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(gymLeadService.createLead(req));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<GymLeadResponse> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody GymLeadStatusUpdateRequest req) {
        return ResponseEntity.ok(gymLeadService.updateStatus(id, req));
    }

    @PostMapping("/{id}/note")
    public ResponseEntity<GymLeadResponse> addNote(
            @PathVariable UUID id,
            @Valid @RequestBody GymLeadNoteRequest req) {
        return ResponseEntity.ok(gymLeadService.addNote(id, req));
    }

    @GetMapping("/pipeline")
    public ResponseEntity<List<PipelineStageDto>> getPipeline() {
        return ResponseEntity.ok(gymLeadService.getPipeline());
    }

    @GetMapping("/followups")
    public ResponseEntity<List<GymLeadResponse>> getFollowups() {
        return ResponseEntity.ok(gymLeadService.getFollowups());
    }
}
