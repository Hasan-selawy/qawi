package com.qawi.service;

import com.qawi.dto.GymLeadSummaryResponse;
import com.qawi.dto.LeadMemberResponse;
import com.qawi.dto.MemberLeadPageResponse;
import com.qawi.entity.Gym;
import com.qawi.entity.Role;
import com.qawi.entity.User;
import com.qawi.exception.AppException;
import com.qawi.repository.GymRepository;
import com.qawi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SuperAdminLeadsService {

    private final GymRepository gymRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<GymLeadSummaryResponse> getGymLeads(String search, String sort) {
        LocalDate today = LocalDate.now();
        String q = normalizeLower(search);

        List<GymLeadSummaryResponse> result = gymRepository.findAll().stream()
                .map(gym -> toSummary(gym, today))
                .filter(s -> q == null
                        || containsLower(s.getName(), q)
                        || containsLower(s.getOwnerName(), q))
                .collect(Collectors.toList());

        sortSummaries(result, sort);
        return result;
    }

    @Transactional(readOnly = true)
    public MemberLeadPageResponse getGymMembers(UUID gymId, String search, String status, int page, int size) {
        gymRepository.findById(gymId)
                .orElseThrow(() -> new AppException("Gym not found", "الصالة غير موجودة", HttpStatus.NOT_FOUND));

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 200);
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));

        LocalDate today = LocalDate.now();
        Page<User> result = userRepository.findLeadMembers(
                gymId, searchParam(search), normalizeStatus(status), today,
                SubscriptionStatusUtil.graceCutoff(today), pageable);

        List<LeadMemberResponse> content = result.getContent().stream()
                .map(u -> toMember(u, today))
                .toList();

        return MemberLeadPageResponse.builder()
                .content(content)
                .page(result.getNumber())
                .size(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build();
    }

    private GymLeadSummaryResponse toSummary(Gym gym, LocalDate today) {
        UUID gymId = gym.getId();
        LocalDate graceCutoff = SubscriptionStatusUtil.graceCutoff(today);
        long total = userRepository.countByGymIdAndRole(gymId, Role.MEMBER);
        long active = userRepository.countByGymIdAndRoleAndIsActiveAndSubscriptionEndDateGreaterThanEqual(gymId, Role.MEMBER, true, today);
        // Everything past the end date splits into grace (within window) and locked-expired.
        long pastDue = userRepository.countByGymIdAndRoleAndIsActiveAndSubscriptionEndDateLessThan(gymId, Role.MEMBER, true, today);
        long expired = userRepository.countByGymIdAndRoleAndIsActiveAndSubscriptionEndDateLessThan(gymId, Role.MEMBER, true, graceCutoff);
        long grace = pastDue - expired;
        long inactive = userRepository.countByGymIdAndRoleAndIsActive(gymId, Role.MEMBER, false);
        long pending = userRepository.countByGymIdAndRoleAndIsActiveAndSubscriptionEndDateIsNull(gymId, Role.MEMBER, true);

        var owner = userRepository.findFirstByGymIdAndRole(gymId, Role.GYM_ADMIN);

        return GymLeadSummaryResponse.builder()
                .id(gymId)
                .name(gym.getName())
                .ownerName(owner.map(User::getName).orElse(null))
                .contactEmail(owner.map(User::getEmail).orElse(null))
                .contactPhone(owner.map(User::getPhone).orElse(null))
                .registeredAt(gym.getCreatedAt())
                .totalMembers(total)
                .activeMembers(active)
                .graceMembers(grace)
                .expiredMembers(expired)
                .inactiveMembers(inactive)
                .pendingMembers(pending)
                .build();
    }

    private LeadMemberResponse toMember(User u, LocalDate today) {
        return LeadMemberResponse.builder()
                .id(u.getId())
                .name(u.getName())
                .email(u.getEmail())
                .phone(u.getPhone())
                .status(memberStatus(u, today))
                .subscriptionStartDate(u.getSubscriptionStartDate())
                .subscriptionEndDate(u.getSubscriptionEndDate())
                .joinedAt(u.getCreatedAt())
                .build();
    }

    /** Single source of truth for derived member status (grace-period aware). */
    private String memberStatus(User u, LocalDate today) {
        return SubscriptionStatusUtil.compute(u, today).name();
    }

    private void sortSummaries(List<GymLeadSummaryResponse> list, String sort) {
        Comparator<GymLeadSummaryResponse> byNewest =
                Comparator.comparing(GymLeadSummaryResponse::getRegisteredAt,
                        Comparator.nullsLast(Comparator.naturalOrder())).reversed();

        String s = sort == null ? "NEWEST" : sort.trim().toUpperCase();
        switch (s) {
            case "OLDEST" -> list.sort(Comparator.comparing(GymLeadSummaryResponse::getRegisteredAt,
                    Comparator.nullsLast(Comparator.naturalOrder())));
            case "ACTIVE" -> list.sort(Comparator.comparingLong(GymLeadSummaryResponse::getActiveMembers).reversed());
            case "EXPIRED" -> list.sort(Comparator.comparingLong(GymLeadSummaryResponse::getExpiredMembers).reversed());
            case "TOTAL" -> list.sort(Comparator.comparingLong(GymLeadSummaryResponse::getTotalMembers).reversed());
            default -> list.sort(byNewest);
        }
    }

    private static String normalize(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }

    /** Non-null search term so PostgreSQL can infer the bind type ('' matches all via LIKE '%%'). */
    private static String searchParam(String s) {
        String n = normalize(s);
        return n == null ? "" : n;
    }

    private static String normalizeLower(String s) {
        String n = normalize(s);
        return n == null ? null : n.toLowerCase();
    }

    private static String normalizeStatus(String s) {
        if (s == null || s.isBlank() || s.equalsIgnoreCase("ALL")) return null;
        return s.trim().toUpperCase();
    }

    private static boolean containsLower(String haystack, String needleLower) {
        return haystack != null && haystack.toLowerCase().contains(needleLower);
    }
}
