package com.qawi.gym.controller;

import com.qawi.gym.dto.request.PaymentRequest;
import com.qawi.gym.dto.response.ApiResponse;
import com.qawi.gym.dto.response.PageResponse;
import com.qawi.gym.dto.response.PaymentResponse;
import com.qawi.gym.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'GYM_OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<PaymentResponse>> recordPayment(@Valid @RequestBody PaymentRequest request) {
        PaymentResponse response = paymentService.recordPayment(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Payment recorded", response));
    }

    @GetMapping("/member/{memberId}")
    public ResponseEntity<ApiResponse<PageResponse<PaymentResponse>>> getMemberPayments(
            @PathVariable Long memberId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("paymentDate").descending());
        return ResponseEntity.ok(ApiResponse.success(paymentService.getMemberPayments(memberId, pageable)));
    }

    @GetMapping("/gym/{gymId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'GYM_OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<PageResponse<PaymentResponse>>> getGymPayments(
            @PathVariable Long gymId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("paymentDate").descending());
        return ResponseEntity.ok(ApiResponse.success(paymentService.getGymPayments(gymId, pageable)));
    }

    @GetMapping("/gym/{gymId}/revenue")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'GYM_OWNER')")
    public ResponseEntity<ApiResponse<BigDecimal>> getGymRevenue(
            @PathVariable Long gymId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        return ResponseEntity.ok(ApiResponse.success(paymentService.getGymRevenue(gymId, from, to)));
    }
}
