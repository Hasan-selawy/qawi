package com.qawi.gym.service;

import com.qawi.gym.dto.request.MembershipPlanRequest;
import com.qawi.gym.dto.response.MembershipPlanResponse;
import com.qawi.gym.entity.Gym;
import com.qawi.gym.entity.MembershipPlan;
import com.qawi.gym.exception.ResourceNotFoundException;
import com.qawi.gym.repository.GymRepository;
import com.qawi.gym.repository.MembershipPlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MembershipPlanService {

    private final MembershipPlanRepository planRepository;
    private final GymRepository gymRepository;

    @Transactional
    public MembershipPlanResponse createPlan(Long gymId, MembershipPlanRequest request) {
        Gym gym = gymRepository.findById(gymId)
                .orElseThrow(() -> new ResourceNotFoundException("Gym", gymId));

        MembershipPlan plan = MembershipPlan.builder()
                .gym(gym)
                .name(request.getName())
                .nameAr(request.getNameAr())
                .description(request.getDescription())
                .price(request.getPrice())
                .billingCycle(request.getBillingCycle())
                .durationDays(request.getDurationDays())
                .maxFreezeDays(request.getMaxFreezeDays() != null ? request.getMaxFreezeDays() : 0)
                .classesIncluded(request.getClassesIncluded() != null ? request.getClassesIncluded() : -1)
                .active(request.getActive() != null ? request.getActive() : true)
                .colorHex(request.getColorHex())
                .build();

        return toResponse(planRepository.save(plan));
    }

    @Transactional(readOnly = true)
    public List<MembershipPlanResponse> getPlansByGym(Long gymId, Boolean activeOnly) {
        if (Boolean.TRUE.equals(activeOnly)) {
            return planRepository.findByGymIdAndActive(gymId, true)
                    .stream().map(this::toResponse).toList();
        }
        return planRepository.findByGymId(gymId).stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public MembershipPlanResponse getPlan(Long id) {
        return toResponse(planRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MembershipPlan", id)));
    }

    @Transactional
    public MembershipPlanResponse updatePlan(Long id, MembershipPlanRequest request) {
        MembershipPlan plan = planRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MembershipPlan", id));

        plan.setName(request.getName());
        if (request.getNameAr() != null) plan.setNameAr(request.getNameAr());
        if (request.getDescription() != null) plan.setDescription(request.getDescription());
        if (request.getPrice() != null) plan.setPrice(request.getPrice());
        if (request.getBillingCycle() != null) plan.setBillingCycle(request.getBillingCycle());
        if (request.getDurationDays() != null) plan.setDurationDays(request.getDurationDays());
        if (request.getMaxFreezeDays() != null) plan.setMaxFreezeDays(request.getMaxFreezeDays());
        if (request.getClassesIncluded() != null) plan.setClassesIncluded(request.getClassesIncluded());
        if (request.getActive() != null) plan.setActive(request.getActive());
        if (request.getColorHex() != null) plan.setColorHex(request.getColorHex());

        return toResponse(planRepository.save(plan));
    }

    @Transactional
    public void deletePlan(Long id) {
        if (!planRepository.existsById(id)) {
            throw new ResourceNotFoundException("MembershipPlan", id);
        }
        planRepository.deleteById(id);
    }

    private MembershipPlanResponse toResponse(MembershipPlan plan) {
        return MembershipPlanResponse.builder()
                .id(plan.getId())
                .gymId(plan.getGym().getId())
                .name(plan.getName())
                .nameAr(plan.getNameAr())
                .description(plan.getDescription())
                .price(plan.getPrice())
                .billingCycle(plan.getBillingCycle())
                .durationDays(plan.getDurationDays())
                .maxFreezeDays(plan.getMaxFreezeDays())
                .classesIncluded(plan.getClassesIncluded())
                .active(plan.isActive())
                .colorHex(plan.getColorHex())
                .createdAt(plan.getCreatedAt())
                .build();
    }
}
