package com.qawi.gym.service;

import com.qawi.gym.dto.request.SubscriptionRequest;
import com.qawi.gym.dto.response.PageResponse;
import com.qawi.gym.dto.response.SubscriptionResponse;
import com.qawi.gym.entity.Member;
import com.qawi.gym.entity.MembershipPlan;
import com.qawi.gym.entity.Subscription;
import com.qawi.gym.entity.enums.SubscriptionStatus;
import com.qawi.gym.exception.BadRequestException;
import com.qawi.gym.exception.ResourceNotFoundException;
import com.qawi.gym.repository.MemberRepository;
import com.qawi.gym.repository.MembershipPlanRepository;
import com.qawi.gym.repository.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SubscriptionService {

    private final SubscriptionRepository subscriptionRepository;
    private final MemberRepository memberRepository;
    private final MembershipPlanRepository planRepository;

    @Transactional
    public SubscriptionResponse createSubscription(SubscriptionRequest request) {
        Member member = memberRepository.findById(request.getMemberId())
                .orElseThrow(() -> new ResourceNotFoundException("Member", request.getMemberId()));

        MembershipPlan plan = planRepository.findById(request.getPlanId())
                .orElseThrow(() -> new ResourceNotFoundException("MembershipPlan", request.getPlanId()));

        if (!plan.isActive()) {
            throw new BadRequestException("Membership plan is not active");
        }

        LocalDate startDate = request.getStartDate();
        LocalDate endDate = startDate.plusDays(plan.getDurationDays());

        Subscription subscription = Subscription.builder()
                .member(member)
                .plan(plan)
                .startDate(startDate)
                .endDate(endDate)
                .pricePaid(request.getPricePaid() != null ? request.getPricePaid() : plan.getPrice())
                .notes(request.getNotes())
                .build();

        return toResponse(subscriptionRepository.save(subscription));
    }

    @Transactional(readOnly = true)
    public SubscriptionResponse getSubscription(Long id) {
        return toResponse(subscriptionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Subscription", id)));
    }

    @Transactional(readOnly = true)
    public PageResponse<SubscriptionResponse> getMemberSubscriptions(Long memberId, Pageable pageable) {
        Page<SubscriptionResponse> page = subscriptionRepository.findByMemberId(memberId, pageable)
                .map(this::toResponse);
        return PageResponse.from(page);
    }

    @Transactional(readOnly = true)
    public PageResponse<SubscriptionResponse> getGymSubscriptions(Long gymId, SubscriptionStatus status, Pageable pageable) {
        Page<SubscriptionResponse> page = subscriptionRepository.findByGymIdAndStatus(gymId, status, pageable)
                .map(this::toResponse);
        return PageResponse.from(page);
    }

    @Transactional
    public SubscriptionResponse freezeSubscription(Long id, LocalDate freezeStart) {
        Subscription subscription = subscriptionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Subscription", id));

        if (subscription.getStatus() != SubscriptionStatus.ACTIVE) {
            throw new BadRequestException("Only active subscriptions can be frozen");
        }

        MembershipPlan plan = subscription.getPlan();
        if (subscription.getFreezeDaysUsed() >= plan.getMaxFreezeDays()) {
            throw new BadRequestException("Maximum freeze days reached for this plan");
        }

        subscription.setStatus(SubscriptionStatus.FROZEN);
        subscription.setFreezeStartDate(freezeStart != null ? freezeStart : LocalDate.now());

        return toResponse(subscriptionRepository.save(subscription));
    }

    @Transactional
    public SubscriptionResponse unfreezeSubscription(Long id) {
        Subscription subscription = subscriptionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Subscription", id));

        if (subscription.getStatus() != SubscriptionStatus.FROZEN) {
            throw new BadRequestException("Subscription is not frozen");
        }

        long frozenDays = subscription.getFreezeStartDate().until(LocalDate.now()).getDays();
        subscription.setFreezeDaysUsed(subscription.getFreezeDaysUsed() + (int) frozenDays);
        subscription.setEndDate(subscription.getEndDate().plusDays(frozenDays));
        subscription.setStatus(SubscriptionStatus.ACTIVE);
        subscription.setFreezeStartDate(null);

        return toResponse(subscriptionRepository.save(subscription));
    }

    @Transactional
    public void cancelSubscription(Long id) {
        Subscription subscription = subscriptionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Subscription", id));
        subscription.setStatus(SubscriptionStatus.CANCELLED);
        subscriptionRepository.save(subscription);
    }

    @Scheduled(cron = "0 0 1 * * *")
    @Transactional
    public void expireSubscriptions() {
        List<Subscription> expiring = subscriptionRepository.findExpiringBetween(
                LocalDate.now().minusDays(1), LocalDate.now());
        expiring.forEach(s -> {
            s.setStatus(SubscriptionStatus.EXPIRED);
            subscriptionRepository.save(s);
        });
    }

    private SubscriptionResponse toResponse(Subscription s) {
        return SubscriptionResponse.builder()
                .id(s.getId())
                .memberId(s.getMember().getId())
                .memberName(s.getMember().getUser().getFullName())
                .memberCode(s.getMember().getMemberCode())
                .planId(s.getPlan().getId())
                .planName(s.getPlan().getName())
                .startDate(s.getStartDate())
                .endDate(s.getEndDate())
                .pricePaid(s.getPricePaid())
                .status(s.getStatus())
                .freezeDaysUsed(s.getFreezeDaysUsed())
                .freezeStartDate(s.getFreezeStartDate())
                .notes(s.getNotes())
                .createdAt(s.getCreatedAt())
                .build();
    }
}
