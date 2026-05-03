package com.qawi.service;

import com.qawi.entity.CoachMember;
import com.qawi.entity.Role;
import com.qawi.entity.User;
import com.qawi.exception.AppException;
import com.qawi.repository.CoachMemberRepository;
import com.qawi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Centralized authorization helpers used across services to enforce
 * role + tenant + ownership checks consistently.
 */
@Service
@RequiredArgsConstructor
public class AccessGuard {

    private final UserRepository userRepository;
    private final CoachMemberRepository coachMemberRepository;

    public User loadUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(
                        "User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));
    }

    public User loadMember(UUID memberId) {
        User member = userRepository.findById(memberId)
                .orElseThrow(() -> notFound("Member"));
        if (member.getRole() != Role.MEMBER) throw notFound("Member");
        return member;
    }

    /**
     * Caller may read this member's data when:
     *  - caller IS the member, OR
     *  - caller is a COACH assigned to the member (same gym), OR
     *  - caller is a GYM_ADMIN in the same gym, OR
     *  - caller is SUPER_ADMIN.
     * Returns the member entity. Throws 403/404 otherwise.
     */
    public User assertCanAccessMember(String callerEmail, UUID memberId) {
        User caller = loadUserByEmail(callerEmail);
        User member = loadMember(memberId);

        switch (caller.getRole()) {
            case MEMBER -> {
                if (!caller.getId().equals(memberId)) throw forbidden();
            }
            case COACH -> {
                if (caller.getGymId() == null
                        || !caller.getGymId().equals(member.getGymId())
                        || !isAssigned(caller.getId(), memberId)) throw forbidden();
            }
            case GYM_ADMIN -> {
                if (caller.getGymId() == null
                        || !caller.getGymId().equals(member.getGymId())) throw forbidden();
            }
            case SUPER_ADMIN -> { /* allowed */ }
            default -> throw forbidden();
        }
        return member;
    }

    /**
     * Caller (must be a COACH) may write to this member's records.
     * Requires same-gym + active assignment. Returns the member entity.
     */
    public User assertCoachManagesMember(String coachEmail, UUID memberId) {
        User coach = loadUserByEmail(coachEmail);
        if (coach.getRole() != Role.COACH) throw forbidden();
        User member = loadMember(memberId);
        if (coach.getGymId() == null
                || !coach.getGymId().equals(member.getGymId())
                || !isAssigned(coach.getId(), memberId)) throw forbidden();
        return member;
    }

    public boolean isAssigned(UUID coachId, UUID memberId) {
        return coachMemberRepository.findByCoachId(coachId).stream()
                .anyMatch((CoachMember cm) -> cm.getMemberId().equals(memberId));
    }

    private AppException forbidden() {
        return new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);
    }

    private AppException notFound(String what) {
        return new AppException(what + " not found", "غير موجود", HttpStatus.NOT_FOUND);
    }
}
