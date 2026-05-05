package com.qawi.controller;

import com.qawi.entity.*;
import com.qawi.service.MemberReportService;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/member")
@PreAuthorize("hasRole('MEMBER')")
@RequiredArgsConstructor
public class MemberReportController {

    private final MemberReportService memberReportService;

    @Data
    static class ReportRequest {
        @NotNull private ReportCategory category;
        @NotBlank private String description;
    }

    @Data
    static class SuggestionRequest {
        @NotBlank private String text;
    }

    @PostMapping("/reports")
    public ResponseEntity<MemberReport> submitReport(
            @RequestBody ReportRequest req,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(memberReportService.submitReport(ud.getUsername(), req.getCategory(), req.getDescription()));
    }

    @PostMapping("/suggestions")
    public ResponseEntity<MemberSuggestion> submitSuggestion(
            @RequestBody SuggestionRequest req,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(memberReportService.submitSuggestion(ud.getUsername(), req.getText()));
    }
}
