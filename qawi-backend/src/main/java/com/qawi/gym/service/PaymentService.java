package com.qawi.gym.service;

import com.qawi.gym.dto.request.PaymentRequest;
import com.qawi.gym.dto.response.PageResponse;
import com.qawi.gym.dto.response.PaymentResponse;
import com.qawi.gym.entity.Member;
import com.qawi.gym.entity.Payment;
import com.qawi.gym.entity.Subscription;
import com.qawi.gym.entity.User;
import com.qawi.gym.exception.ResourceNotFoundException;
import com.qawi.gym.repository.MemberRepository;
import com.qawi.gym.repository.PaymentRepository;
import com.qawi.gym.repository.SubscriptionRepository;
import com.qawi.gym.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final MemberRepository memberRepository;
    private final UserRepository userRepository;

    @Transactional
    public PaymentResponse recordPayment(PaymentRequest request) {
        Subscription subscription = subscriptionRepository.findById(request.getSubscriptionId())
                .orElseThrow(() -> new ResourceNotFoundException("Subscription", request.getSubscriptionId()));

        Member member = memberRepository.findById(request.getMemberId())
                .orElseThrow(() -> new ResourceNotFoundException("Member", request.getMemberId()));

        User collectedBy = getCurrentUser();

        Payment payment = Payment.builder()
                .subscription(subscription)
                .member(member)
                .amount(request.getAmount())
                .paymentMethod(request.getPaymentMethod())
                .transactionReference(request.getTransactionReference())
                .paymentDate(LocalDateTime.now())
                .notes(request.getNotes())
                .collectedBy(collectedBy)
                .build();

        return toResponse(paymentRepository.save(payment));
    }

    @Transactional(readOnly = true)
    public PageResponse<PaymentResponse> getMemberPayments(Long memberId, Pageable pageable) {
        Page<PaymentResponse> page = paymentRepository.findByMemberId(memberId, pageable)
                .map(this::toResponse);
        return PageResponse.from(page);
    }

    @Transactional(readOnly = true)
    public PageResponse<PaymentResponse> getGymPayments(Long gymId, Pageable pageable) {
        Page<PaymentResponse> page = paymentRepository.findByGymId(gymId, pageable)
                .map(this::toResponse);
        return PageResponse.from(page);
    }

    @Transactional(readOnly = true)
    public BigDecimal getGymRevenue(Long gymId, LocalDateTime from, LocalDateTime to) {
        BigDecimal revenue = paymentRepository.sumRevenueByGymIdAndDateRange(gymId, from, to);
        return revenue != null ? revenue : BigDecimal.ZERO;
    }

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email).orElse(null);
    }

    private PaymentResponse toResponse(Payment p) {
        return PaymentResponse.builder()
                .id(p.getId())
                .subscriptionId(p.getSubscription().getId())
                .memberId(p.getMember().getId())
                .memberName(p.getMember().getUser().getFullName())
                .amount(p.getAmount())
                .paymentMethod(p.getPaymentMethod())
                .status(p.getStatus())
                .transactionReference(p.getTransactionReference())
                .paymentDate(p.getPaymentDate())
                .notes(p.getNotes())
                .collectedBy(p.getCollectedBy() != null ? p.getCollectedBy().getFullName() : null)
                .createdAt(p.getCreatedAt())
                .build();
    }
}
