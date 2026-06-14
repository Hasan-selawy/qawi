package com.qawi.controller;

import com.qawi.dto.*;
import com.qawi.entity.User;
import com.qawi.service.MemberLeadService;
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
@RequestMapping("/api/v1/gym/leads")
@PreAuthorize("hasAnyRole('GYM_ADMIN','RECEPTIONIST','SALES')")
@RequiredArgsConstructor
public class GymSalesController {

    private final MemberLeadService memberLeadService;

    @GetMapping
    public ResponseEntity<List<MemberLeadResponse>> getLeads(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String source,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(
                memberLeadService.getLeads(userDetails.getUsername(), q, status, type, source));
    }

    @PostMapping
    public ResponseEntity<MemberLeadResponse> createLead(
            @Valid @RequestBody MemberLeadRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(memberLeadService.createLead(req, userDetails.getUsername()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MemberLeadResponse> updateLead(
            @PathVariable UUID id,
            @Valid @RequestBody MemberLeadUpdateRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(memberLeadService.updateLead(id, req, userDetails.getUsername()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteLead(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails) {
        memberLeadService.deleteLead(id, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/convert")
    public ResponseEntity<User> convertLead(
            @PathVariable UUID id,
            @Valid @RequestBody MemberLeadConvertRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(memberLeadService.convertLead(id, req, userDetails.getUsername()));
    }

    @PostMapping("/{id}/note")
    public ResponseEntity<MemberLeadResponse> addNote(
            @PathVariable UUID id,
            @Valid @RequestBody CrmNoteRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(memberLeadService.addNote(id, req, userDetails.getUsername()));
    }

    @PostMapping("/{id}/renew")
    public ResponseEntity<MemberLeadResponse> renewMember(
            @PathVariable UUID id,
            @Valid @RequestBody CrmRenewRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(memberLeadService.renewMember(id, req, userDetails.getUsername()));
    }
}
