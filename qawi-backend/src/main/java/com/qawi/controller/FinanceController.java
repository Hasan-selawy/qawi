package com.qawi.controller;

import com.qawi.service.FinanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/finance")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ACCOUNTANT','GYM_ADMIN')")
public class FinanceController {

    private final FinanceService financeService;

    @GetMapping("/revenue")
    public ResponseEntity<Map<String, Object>> getRevenue(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(financeService.getRevenueSummary(ud.getUsername()));
    }

    @GetMapping("/subscriptions")
    public ResponseEntity<Map<String, Object>> getSubscriptions(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(financeService.getSubscriptions(ud.getUsername()));
    }

    @GetMapping("/members")
    public ResponseEntity<List<Map<String, Object>>> getMemberFinances(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(financeService.getMemberFinances(ud.getUsername()));
    }

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getSummary(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(financeService.getFinanceSummary(ud.getUsername()));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportCsv(@AuthenticationPrincipal UserDetails ud) {
        String csv = financeService.exportCsv(ud.getUsername());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"members-finance.csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv.getBytes());
    }
}
