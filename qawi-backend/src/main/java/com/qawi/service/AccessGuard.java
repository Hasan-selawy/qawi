package com.qawi.service;

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

    /**
     * Load a caller and require that it belongs to a tenant. Platform users do
     * not have a gym and must use an explicitly platform-scoped operation.
     */
    public User loadTenantUserByEmail(String email) {
        User caller = loadUserByEmail(email);
        requireGymId(caller);
        return caller;
    }

    /** Return the caller's tenant id, rejecting unassigned/platform accounts. */
    public UUID requireGymId(User caller) {
        if (caller.getGymId() == null) {
            throw forbidden();
        }
        return caller.getGymId();
    }

    /**
     * Low-level tenant boundary check. This does not grant a business
     * permission: controllers/services must still enforce the allowed role.
     * SUPER_ADMIN is the only role allowed to cross tenant boundaries.
     */
    public void assertSameGym(User caller, UUID targetGymId) {
        if (caller.getRole() == Role.SUPER_ADMIN) {
            return;
        }
        if (caller.getGymId() == null || targetGymId == null
                || !caller.getGymId().equals(targetGymId)) {
            throw forbidden();
        }
    }

    /** Load a target user without allowing its existence to leak across gyms. */
    public User loadUserInCallerGym(String callerEmail, UUID targetUserId) {
        User caller = loadUserByEmail(callerEmail);
        if (caller.getRole() == Role.SUPER_ADMIN) {
            return userRepository.findById(targetUserId)
                    .orElseThrow(() -> notFound("User"));
        }
        UUID gymId = requireGymId(caller);
        return userRepository.findByIdAndGymId(targetUserId, gymId)
                .orElseThrow(() -> notFound("User"));
    }

    /** Load a user from a known tenant without an unscoped findById call. */
    public User loadUserInGym(UUID targetUserId, UUID gymId) {
        if (gymId == null) {
            throw forbidden();
        }
        return userRepository.findByIdAndGymId(targetUserId, gymId)
                .orElseThrow(() -> notFound("User"));
    }

    private User loadMember(UUID memberId) {
        User member = userRepository.findById(memberId)
                .orElseThrow(() -> notFound("Member"));
        if (member.getRole() != Role.MEMBER) throw notFound("Member");
        return member;
    }

    /** Load a member from a known tenant without exposing cross-tenant IDs. */
    public User loadMemberInGym(UUID memberId, UUID gymId) {
        User member = loadUserInGym(memberId, gymId);
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
        User member = caller.getRole() == Role.SUPER_ADMIN
                ? loadMember(memberId)
                : loadMemberInGym(memberId, requireGymId(caller));

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
        return assertCoachManagesMember(loadUserByEmail(coachEmail), memberId);
    }

    public User assertCoachManagesMember(User coach, UUID memberId) {
        if (coach.getRole() != Role.COACH) throw forbidden();
        User member = loadMemberInGym(memberId, requireGymId(coach));
        if (!isAssigned(coach.getId(), memberId)) throw forbidden();
        return member;
    }

    public boolean isAssigned(UUID coachId, UUID memberId) {
        return coachMemberRepository.existsByCoachIdAndMemberId(coachId, memberId);
    }

    private AppException forbidden() {
        return new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);
    }

    private AppException notFound(String what) {
        return new AppException(what + " not found", "غير موجود", HttpStatus.NOT_FOUND);
    }
}
