package com.qawi.gym.controller;

import com.qawi.gym.dto.request.SubscriptionRequest;
import com.qawi.gym.dto.response.ApiResponse;
import com.qawi.gym.dto.response.PageResponse;
import com.qawi.gym.dto.response.SubscriptionResponse;
import com.qawi.gym.entity.enums.SubscriptionStatus;
import com.qawi.gym.service.SubscriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/subscriptions")
@RequiredArgsConstructor
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'GYM_OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<SubscriptionResponse>> createSubscription(
            @Valid @RequestBody SubscriptionRequest request) {
        SubscriptionResponse response = subscriptionService.createSubscription(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Subscription created", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SubscriptionResponse>> getSubscription(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(subscriptionService.getSubscription(id)));
    }

    @GetMapping("/member/{memberId}")
    public ResponseEntity<ApiResponse<PageResponse<SubscriptionResponse>>> getMemberSubscriptions(
            @PathVariable Long memberId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(ApiResponse.success(subscriptionService.getMemberSubscriptions(memberId, pageable)));
    }

    @GetMapping("/gym/{gymId}")
    public ResponseEntity<ApiResponse<PageResponse<SubscriptionResponse>>> getGymSubscriptions(
            @PathVariable Long gymId,
            @RequestParam(defaultValue = "ACTIVE") SubscriptionStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(ApiResponse.success(
                subscriptionService.getGymSubscriptions(gymId, status, pageable)));
    }

    @PostMapping("/{id}/freeze")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'GYM_OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<SubscriptionResponse>> freezeSubscription(
            @PathVariable Long id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate freezeStart) {
        return ResponseEntity.ok(ApiResponse.success("Subscription frozen",
                subscriptionService.freezeSubscription(id, freezeStart)));
    }

    @PostMapping("/{id}/unfreeze")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'GYM_OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<SubscriptionResponse>> unfreezeSubscription(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Subscription unfrozen",
                subscriptionService.unfreezeSubscription(id)));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'GYM_OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<Void>> cancelSubscription(@PathVariable Long id) {
        subscriptionService.cancelSubscription(id);
        return ResponseEntity.ok(ApiResponse.success("Subscription cancelled", null));
    }
}
