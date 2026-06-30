package com.qawi.service;

import com.qawi.dto.GymMemberPlanDto;
import com.qawi.dto.GymMemberPlanRequest;
import com.qawi.dto.NotificationCommand;
import com.qawi.dto.RenewalRequestDto;
import com.qawi.dto.SubmitRenewalRequest;
import com.qawi.entity.*;
import com.qawi.event.NotificationDispatchEvent;
import com.qawi.exception.AppException;
import com.qawi.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GymMemberPlanService {

    private final GymMemberPlanRepository planRepository;
    private final RenewalRequestRepository renewalRequestRepository;
    private final UserRepository userRepository;
    private final GymRepository gymRepository;
    private final ApplicationEventPublisher eventPublisher;

    private static final java.util.Map<MemberPlanDuration, String> DURATION_LABELS = java.util.Map.of(
            MemberPlanDuration.ONE_MONTH, "1 Month",
            MemberPlanDuration.THREE_MONTHS, "3 Months",
            MemberPlanDuration.SIX_MONTHS, "6 Months",
            MemberPlanDuration.TWELVE_MONTHS, "12 Months"
    );
    private static final java.util.Map<MemberPlanDuration, String> DURATION_LABELS_AR = java.util.Map.of(
            MemberPlanDuration.ONE_MONTH, "شهر واحد",
            MemberPlanDuration.THREE_MONTHS, "3 أشهر",
            MemberPlanDuration.SIX_MONTHS, "6 أشهر",
            MemberPlanDuration.TWELVE_MONTHS, "12 شهراً"
    );

    @Transactional(readOnly = true)
    public List<GymMemberPlanDto> getPlansForAdmin(String adminEmail) {
        UUID gymId = getGymIdForAdmin(adminEmail);
        return planRepository.findByGymIdOrderByDurationAscCreatedAtAsc(gymId)
                .stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<GymMemberPlanDto> getActivePlansForGym(UUID gymId) {
        return planRepository.findByGymIdAndActiveTrueOrderByDurationAscCreatedAtAsc(gymId)
                .stream().map(this::toDto).toList();
    }

    @Transactional
    public GymMemberPlanDto createPlan(GymMemberPlanRequest req, String adminEmail) {
        UUID gymId = getGymIdForAdmin(adminEmail);
        GymMemberPlan plan = GymMemberPlan.builder()
                .gymId(gymId)
                .name(req.getName())
                .nameAr(req.getNameAr())
                .duration(req.getDuration())
                .price(req.getPrice() != null ? req.getPrice() : BigDecimal.ZERO)
                .description(req.getDescription())
                .descriptionAr(req.getDescriptionAr())
                .active(req.getActive() == null || req.getActive())
                .build();
        return toDto(planRepository.save(plan));
    }

    @Transactional
    public GymMemberPlanDto updatePlan(UUID planId, GymMemberPlanRequest req, String adminEmail) {
        UUID gymId = getGymIdForAdmin(adminEmail);
        GymMemberPlan plan = planRepository.findById(planId)
                .orElseThrow(() -> new AppException("Plan not found", "الخطة غير موجودة", HttpStatus.NOT_FOUND));
        if (!plan.getGymId().equals(gymId)) {
            throw new AppException("Forbidden", "غير مسموح", HttpStatus.FORBIDDEN);
        }
        if (req.getName() != null) plan.setName(req.getName());
        if (req.getNameAr() != null) plan.setNameAr(req.getNameAr());
        if (req.getDuration() != null) plan.setDuration(req.getDuration());
        if (req.getPrice() != null) plan.setPrice(req.getPrice());
        if (req.getDescription() != null) plan.setDescription(req.getDescription());
        if (req.getDescriptionAr() != null) plan.setDescriptionAr(req.getDescriptionAr());
        if (req.getActive() != null) plan.setActive(req.getActive());
        return toDto(planRepository.save(plan));
    }

    @Transactional
    public void deletePlan(UUID planId, String adminEmail) {
        UUID gymId = getGymIdForAdmin(adminEmail);
        GymMemberPlan plan = planRepository.findById(planId)
                .orElseThrow(() -> new AppException("Plan not found", "الخطة غير موجودة", HttpStatus.NOT_FOUND));
        if (!plan.getGymId().equals(gymId)) {
            throw new AppException("Forbidden", "غير مسموح", HttpStatus.FORBIDDEN);
        }
        plan.setActive(false);
        planRepository.save(plan);
    }

    @Transactional(readOnly = true)
    public List<RenewalRequestDto> getRenewalRequests(String adminEmail) {
        UUID gymId = getGymIdForAdmin(adminEmail);
        return renewalRequestRepository.findByGymIdOrderByCreatedAtDesc(gymId)
                .stream().map(this::toRenewalDto).toList();
    }

    @Transactional
    public RenewalRequestDto updateRenewalStatus(UUID requestId, String status, String adminEmail) {
        UUID gymId = getGymIdForAdmin(adminEmail);
        RenewalRequest req = renewalRequestRepository.findById(requestId)
                .orElseThrow(() -> new AppException("Request not found", "الطلب غير موجود", HttpStatus.NOT_FOUND));
        if (!req.getGymId().equals(gymId)) {
            throw new AppException("Forbidden", "غير مسموح", HttpStatus.FORBIDDEN);
        }
        req.setStatus(RenewalRequestStatus.valueOf(status.toUpperCase()));
        return toRenewalDto(renewalRequestRepository.save(req));
    }

    @Transactional(readOnly = true)
    public List<RenewalRequestDto> getMyRenewalRequests(UUID memberId) {
        return renewalRequestRepository.findByMemberIdOrderByCreatedAtDesc(memberId)
                .stream().map(this::toRenewalDto).toList();
    }

    @Transactional
    public RenewalRequestDto submitRenewalRequest(SubmitRenewalRequest req, String memberEmail) {
        User member = userRepository.findByEmail(memberEmail)
                .orElseThrow(() -> new AppException("Member not found", "العضو غير موجود", HttpStatus.NOT_FOUND));
        RenewalRequest renewal = RenewalRequest.builder()
                .memberId(member.getId())
                .memberName(member.getName())
                .gymId(member.getGymId())
                .planId(req.getPlanId())
                .planName(req.getPlanName())
                .planNameAr(req.getPlanNameAr())
                .planDuration(req.getPlanDuration())
                .notes(req.getNotes())
                .status(RenewalRequestStatus.PENDING)
                .build();
        var savedRenewal = renewalRequestRepository.save(renewal);
        RenewalRequestDto dto = toRenewalDto(savedRenewal);
        notifyAdminsRenewalRequest(member.getGymId(), savedRenewal.getId(), member.getName(), req.getPlanName());
        return dto;
    }

    private void notifyAdminsRenewalRequest(UUID gymId, UUID requestId, String memberName, String planName) {
        if (gymId == null) return;
        NotificationTemplates.Content c = NotificationTemplates.renewalRequestAdmin(memberName, planName);
        List<NotificationCommand> cmds = new ArrayList<>();
        for (User adminUser : userRepository.findByGymIdAndRole(gymId, Role.GYM_ADMIN)) {
            cmds.add(NotificationCommand.builder()
                    .userId(adminUser.getId()).gymId(gymId)
                    .type(NotificationType.RENEWAL_REQUEST)
                    .titleEn(c.titleEn()).titleAr(c.titleAr())
                    .message(c.bodyEn()).messageAr(c.bodyAr())
                    .actionUrl("/admin/subscriptions")
                    .uniqueKey("renewal-request:" + requestId + ":" + adminUser.getId())
                    .build());
        }
        if (!cmds.isEmpty()) eventPublisher.publishEvent(new NotificationDispatchEvent(cmds));
    }

    private UUID getGymIdForAdmin(String email) {
        User admin = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("Admin not found", "المشرف غير موجود", HttpStatus.NOT_FOUND));
        return admin.getGymId();
    }

    private GymMemberPlanDto toDto(GymMemberPlan p) {
        return GymMemberPlanDto.builder()
                .id(p.getId())
                .gymId(p.getGymId())
                .name(p.getName())
                .nameAr(p.getNameAr())
                .duration(p.getDuration())
                .durationLabel(DURATION_LABELS.getOrDefault(p.getDuration(), p.getDuration().name()))
                .durationLabelAr(DURATION_LABELS_AR.getOrDefault(p.getDuration(), p.getDuration().name()))
                .price(p.getPrice())
                .description(p.getDescription())
                .descriptionAr(p.getDescriptionAr())
                .active(p.isActive())
                .build();
    }

    private RenewalRequestDto toRenewalDto(RenewalRequest r) {
        return RenewalRequestDto.builder()
                .id(r.getId())
                .memberId(r.getMemberId())
                .memberName(r.getMemberName())
                .gymId(r.getGymId())
                .planId(r.getPlanId())
                .planName(r.getPlanName())
                .planNameAr(r.getPlanNameAr())
                .planDuration(r.getPlanDuration())
                .status(r.getStatus())
                .notes(r.getNotes())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
