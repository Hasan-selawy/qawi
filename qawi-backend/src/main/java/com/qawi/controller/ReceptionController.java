package com.qawi.controller;

import com.qawi.dto.CreateWalkInMemberRequest;
import com.qawi.dto.RenewSubscriptionRequest;
import com.qawi.service.ReceptionService;
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
@RequestMapping("/api/v1/reception")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('RECEPTIONIST','GYM_ADMIN')")
public class ReceptionController {

    private final ReceptionService receptionService;

    @GetMapping("/members/search")
    public ResponseEntity<List<?>> searchMembers(
            @RequestParam(required = false) String q,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(receptionService.searchMembers(ud.getUsername(), q));
    }

    @PostMapping("/checkin/{memberId}")
    public ResponseEntity<Map<String, Object>> checkIn(
            @PathVariable UUID memberId,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(receptionService.checkIn(ud.getUsername(), memberId));
    }

    @PostMapping("/members")
    public ResponseEntity<Map<String, Object>> createWalkIn(
            @Valid @RequestBody CreateWalkInMemberRequest req,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(receptionService.createWalkInMember(ud.getUsername(), req));
    }

    @PostMapping("/members/{memberId}/assign-coach")
    public ResponseEntity<Map<String, Object>> assignCoach(
            @PathVariable UUID memberId,
            @RequestBody Map<String, UUID> body,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(receptionService.assignCoach(ud.getUsername(), memberId, body.get("coachId")));
    }

    @PutMapping("/members/{memberId}/renew")
    public ResponseEntity<Map<String, Object>> renewSubscription(
            @PathVariable UUID memberId,
            @Valid @RequestBody RenewSubscriptionRequest req,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(receptionService.renewSubscription(ud.getUsername(), memberId, req));
    }

    @GetMapping("/today")
    public ResponseEntity<?> getTodayStats(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(receptionService.getTodayStats(ud.getUsername()));
    }

    @GetMapping("/live-feed")
    public ResponseEntity<List<Map<String, Object>>> getLiveFeed(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(receptionService.getLiveFeed(ud.getUsername()));
    }

    @GetMapping("/alerts")
    public ResponseEntity<List<Map<String, Object>>> getAlerts(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(receptionService.getAlerts(ud.getUsername()));
    }

    @GetMapping("/coaches")
    public ResponseEntity<?> getCoaches(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(receptionService.getGymCoaches(ud.getUsername()));
    }
}
