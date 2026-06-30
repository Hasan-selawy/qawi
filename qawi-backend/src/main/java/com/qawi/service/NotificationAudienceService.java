package com.qawi.service;

import com.qawi.entity.AudienceSegment;
import com.qawi.entity.NotificationSetting;
import com.qawi.entity.Role;
import com.qawi.entity.User;
import com.qawi.exception.AppException;
import com.qawi.repository.AttendanceRepository;
import com.qawi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Resolves an {@link AudienceSegment} to the concrete list of recipients within
 * a single gym. Always gym-scoped — a target user from another gym is rejected.
 */
@Service
@RequiredArgsConstructor
public class NotificationAudienceService {

    private static final List<Role> STAFF_ROLES = List.of(
            Role.GYM_ADMIN, Role.COACH, Role.NUTRITIONIST, Role.RECEPTIONIST,
            Role.SALES, Role.ACCOUNTANT, Role.HR);

    private final UserRepository userRepository;
    private final AttendanceRepository attendanceRepository;
    private final NotificationSettingService notificationSettingService;

    @Transactional(readOnly = true)
    public List<User> resolve(UUID gymId, AudienceSegment audience, UUID targetUserId) {
        LocalDate today = LocalDate.now();
        return switch (audience) {
            case ALL_MEMBERS -> userRepository.findByGymIdAndRole(gymId, Role.MEMBER);

            case ACTIVE_MEMBERS -> userRepository.findByGymIdAndRole(gymId, Role.MEMBER).stream()
                    .filter(User::isActive)
                    .filter(u -> u.getSubscriptionEndDate() == null || !u.getSubscriptionEndDate().isBefore(today))
                    .collect(Collectors.toList());

            case EXPIRING_MEMBERS ->
                    userRepository.findMembersWithExpiringSubscription(gymId, today, today.plusDays(7));

            case EXPIRED_MEMBERS -> userRepository.findExpiredMembers(gymId, today);

            case INACTIVE_MEMBERS -> resolveInactiveMembers(gymId);

            case COACHES -> userRepository.findByGymIdAndRole(gymId, Role.COACH);

            case ALL_STAFF -> userRepository.findByGymIdAndRoleIn(gymId, STAFF_ROLES);

            case ALL_USERS -> userRepository.findByGymId(gymId);

            case SPECIFIC_MEMBER -> resolveSpecific(gymId, targetUserId);
        };
    }

    @Transactional(readOnly = true)
    public int count(UUID gymId, AudienceSegment audience, UUID targetUserId) {
        return resolve(gymId, audience, targetUserId).size();
    }

    private List<User> resolveInactiveMembers(UUID gymId) {
        NotificationSetting setting = notificationSettingService.getOrCreate(gymId);
        LocalDateTime since = LocalDateTime.now().minusDays(Math.max(setting.getInactiveAfterDays(), 1));
        Set<UUID> recentlyActive = new HashSet<>(
                attendanceRepository.findDistinctMemberIdsByGymIdAndCheckedInAtAfter(gymId, since));
        return userRepository.findByGymIdAndRole(gymId, Role.MEMBER).stream()
                .filter(User::isActive)
                .filter(u -> !recentlyActive.contains(u.getId()))
                .collect(Collectors.toList());
    }

    private List<User> resolveSpecific(UUID gymId, UUID targetUserId) {
        if (targetUserId == null) {
            throw new AppException("targetUserId is required for SPECIFIC_MEMBER",
                    "معرف المستخدم مطلوب", HttpStatus.BAD_REQUEST);
        }
        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> new AppException("Target user not found",
                        "المستخدم المستهدف غير موجود", HttpStatus.NOT_FOUND));
        if (user.getGymId() == null || !user.getGymId().equals(gymId)) {
            throw new AppException("Target user is not in your gym",
                    "المستخدم المستهدف ليس في صالتك", HttpStatus.FORBIDDEN);
        }
        return List.of(user);
    }
}
