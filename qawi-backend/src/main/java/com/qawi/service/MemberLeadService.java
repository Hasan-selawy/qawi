package com.qawi.service;

import com.qawi.dto.*;
import com.qawi.entity.*;
import com.qawi.exception.AppException;
import com.qawi.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MemberLeadService {

    private final MemberLeadRepository memberLeadRepository;
    private final UserRepository userRepository;
    private final GymRepository gymRepository;
    private final CoachMemberRepository coachMemberRepository;
    private final PasswordEncoder passwordEncoder;

    // ── helpers ─────────────────────────────────────────────────────────────

    private User getCallerUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));
    }

    private MemberLead findLeadInGym(UUID id, UUID gymId) {
        MemberLead lead = memberLeadRepository.findById(id)
                .orElseThrow(() -> new AppException("Lead not found", "السجل غير موجود", HttpStatus.NOT_FOUND));
        if (!lead.getGymId().equals(gymId)) {
            throw new AppException("Access denied", "غير مصرح", HttpStatus.FORBIDDEN);
        }
        return lead;
    }

    public static MemberLeadStatus calculateStatus(LocalDate endDate) {
        if (endDate == null) return MemberLeadStatus.ACTIVE;
        LocalDate today = LocalDate.now();
        if (endDate.isBefore(today.minusDays(60))) return MemberLeadStatus.LOST;
        if (endDate.isBefore(today))               return MemberLeadStatus.EXPIRED;
        if (endDate.isBefore(today.plusDays(8)))   return MemberLeadStatus.EXPIRING_SOON;
        return MemberLeadStatus.ACTIVE;
    }

    private Map<UUID, String> coachNamesForGym(UUID gymId) {
        return userRepository.findByGymIdAndRole(gymId, Role.COACH)
                .stream().collect(Collectors.toMap(User::getId, User::getName));
    }

    // ── list (with optional filters) ────────────────────────────────────────

    public List<MemberLeadResponse> getLeads(String callerEmail,
                                             String q,
                                             String statusStr,
                                             String typeStr,
                                             String sourceStr) {
        UUID gymId = getCallerUser(callerEmail).getGymId();
        List<MemberLead> all = memberLeadRepository.findByGymIdOrderByCreatedAtDesc(gymId);
        Map<UUID, String> coachNames = coachNamesForGym(gymId);

        return all.stream()
                .filter(l -> {
                    if (q == null || q.isBlank()) return true;
                    String ql = q.toLowerCase();
                    return l.getName().toLowerCase().contains(ql)
                            || (l.getPhoneNumber() != null && l.getPhoneNumber().contains(q))
                            || (l.getEmail() != null && l.getEmail().toLowerCase().contains(ql));
                })
                .filter(l -> {
                    if (statusStr == null || statusStr.isBlank()) return true;
                    try { return l.getStatus() == MemberLeadStatus.valueOf(statusStr); }
                    catch (Exception e) { return true; }
                })
                .filter(l -> {
                    if (typeStr == null || typeStr.isBlank()) return true;
                    try { return l.getType() == MemberLeadType.valueOf(typeStr); }
                    catch (Exception e) { return true; }
                })
                .filter(l -> {
                    if (sourceStr == null || sourceStr.isBlank()) return true;
                    try { return l.getSource() == com.qawi.entity.MemberLeadSource.valueOf(sourceStr); }
                    catch (Exception e) { return true; }
                })
                .map(l -> MemberLeadResponse.from(l, coachNames.get(l.getCoachId())))
                .toList();
    }

    // ── create prospect ──────────────────────────────────────────────────────

    @Transactional
    public MemberLeadResponse createLead(MemberLeadRequest req, String callerEmail) {
        User caller = getCallerUser(callerEmail);
        MemberLead lead = MemberLead.builder()
                .gymId(caller.getGymId())
                .name(req.getName())
                .phoneNumber(req.getPhoneNumber())
                .notes(req.getNotes())
                .source(req.getSource())
                .type(MemberLeadType.PROSPECT)
                .status(MemberLeadStatus.NEW)
                .createdBy(caller.getId())
                .build();
        return MemberLeadResponse.from(memberLeadRepository.save(lead));
    }

    // ── update (PROSPECT or MEMBER status/notes/follow-up) ──────────────────

    @Transactional
    public MemberLeadResponse updateLead(UUID id, MemberLeadUpdateRequest req, String callerEmail) {
        UUID gymId = getCallerUser(callerEmail).getGymId();
        MemberLead lead = findLeadInGym(id, gymId);

        if (req.getStatus() != null) lead.setStatus(req.getStatus());
        if (req.getSource() != null) lead.setSource(req.getSource());
        if (req.getNotes() != null) lead.setNotes(req.getNotes());
        if (req.getNextFollowUpAt() != null) lead.setNextFollowUpAt(req.getNextFollowUpAt());
        if (req.getLastContactedAt() != null) lead.setLastContactedAt(req.getLastContactedAt());
        lead.setLastUpdatedAt(LocalDateTime.now());

        Map<UUID, String> coachNames = coachNamesForGym(gymId);
        return MemberLeadResponse.from(memberLeadRepository.save(lead), coachNames.get(lead.getCoachId()));
    }

    // ── delete (PROSPECT only) ───────────────────────────────────────────────

    @Transactional
    public void deleteLead(UUID id, String callerEmail) {
        UUID gymId = getCallerUser(callerEmail).getGymId();
        MemberLead lead = findLeadInGym(id, gymId);
        if (lead.getType() == MemberLeadType.MEMBER) {
            throw new AppException("Cannot delete a member CRM record", "لا يمكن حذف سجل عضو", HttpStatus.FORBIDDEN);
        }
        memberLeadRepository.delete(lead);
    }

    // ── convert PROSPECT → MEMBER ────────────────────────────────────────────

    @Transactional
    public User convertLead(UUID id, MemberLeadConvertRequest req, String callerEmail) {
        User caller = getCallerUser(callerEmail);
        UUID gymId = caller.getGymId();
        MemberLead lead = findLeadInGym(id, gymId);

        if (userRepository.existsByEmail(req.getEmail())) {
            throw new AppException("Email already registered", "البريد الإلكتروني مسجل مسبقاً", HttpStatus.CONFLICT);
        }

        Gym gym = gymRepository.findById(gymId).orElse(null);
        if (gym != null && gym.getMaxMembers() != null) {
            long current = userRepository.countByGymIdAndRole(gymId, Role.MEMBER);
            if (current >= gym.getMaxMembers()) {
                throw new AppException(
                        "Member limit reached. Upgrade your plan.",
                        "تم بلوغ الحد الأقصى لعدد الأعضاء. يرجى ترقية الخطة.",
                        HttpStatus.FORBIDDEN);
            }
        }

        String phone = req.getPhoneNumber() != null ? req.getPhoneNumber() : lead.getPhoneNumber();
        User member = userRepository.save(User.builder()
                .name(lead.getName())
                .email(req.getEmail())
                .password(passwordEncoder.encode(req.getPassword()))
                .role(Role.MEMBER)
                .gymId(gymId)
                .phone(phone)
                .subscriptionEndDate(req.getSubscriptionEndDate())
                .subscriptionStartDate(LocalDate.now())
                .build());

        if (req.getCoachId() != null) {
            userRepository.findById(req.getCoachId()).ifPresent(coach ->
                    coachMemberRepository.save(CoachMember.builder()
                            .coachId(coach.getId())
                            .memberId(member.getId())
                            .build()));
        }

        // Update the CRM record — do NOT delete it
        lead.setType(MemberLeadType.MEMBER);
        lead.setMemberId(member.getId());
        lead.setEmail(req.getEmail());
        lead.setPhoneNumber(phone);
        lead.setStatus(MemberLeadStatus.ACTIVE);
        lead.setSubscriptionStartDate(LocalDate.now());
        lead.setSubscriptionEndDate(req.getSubscriptionEndDate());
        if (req.getCoachId() != null) lead.setCoachId(req.getCoachId());
        lead.setLastUpdatedAt(LocalDateTime.now());
        memberLeadRepository.save(lead);

        return member;
    }

    // ── add note (appends with timestamp) ───────────────────────────────────

    @Transactional
    public MemberLeadResponse addNote(UUID id, CrmNoteRequest req, String callerEmail) {
        UUID gymId = getCallerUser(callerEmail).getGymId();
        MemberLead lead = findLeadInGym(id, gymId);

        String existing = lead.getNotes() != null ? lead.getNotes().trim() : "";
        String ts = LocalDate.now().toString();
        lead.setNotes(existing.isEmpty() ? "[" + ts + "] " + req.getNote()
                                         : existing + "\n---\n[" + ts + "] " + req.getNote());
        lead.setLastContactedAt(LocalDateTime.now());
        lead.setLastUpdatedAt(LocalDateTime.now());

        Map<UUID, String> coachNames = coachNamesForGym(gymId);
        return MemberLeadResponse.from(memberLeadRepository.save(lead), coachNames.get(lead.getCoachId()));
    }

    // ── renew subscription ───────────────────────────────────────────────────

    @Transactional
    public MemberLeadResponse renewMember(UUID id, CrmRenewRequest req, String callerEmail) {
        UUID gymId = getCallerUser(callerEmail).getGymId();
        MemberLead lead = findLeadInGym(id, gymId);

        lead.setSubscriptionEndDate(req.getSubscriptionEndDate());
        lead.setSubscriptionStartDate(LocalDate.now());
        lead.setStatus(calculateStatus(req.getSubscriptionEndDate()));
        lead.setLastUpdatedAt(LocalDateTime.now());

        // Mirror the renewal on the linked User record
        if (lead.getMemberId() != null) {
            userRepository.findById(lead.getMemberId()).ifPresent(user -> {
                user.setSubscriptionEndDate(req.getSubscriptionEndDate());
                user.setSubscriptionStartDate(LocalDate.now());
                userRepository.save(user);
            });
        }

        Map<UUID, String> coachNames = coachNamesForGym(gymId);
        return MemberLeadResponse.from(memberLeadRepository.save(lead), coachNames.get(lead.getCoachId()));
    }

    // ── idempotent backfill — call from seeder ────────────────────────────────

    @Transactional
    public void backfillGymMembers(UUID gymId) {
        // Find a gym admin to use as createdBy (satisfies NOT NULL constraint)
        UUID systemUserId = userRepository.findByGymIdAndRole(gymId, Role.GYM_ADMIN)
                .stream().findFirst().map(User::getId).orElse(gymId);

        List<User> members = userRepository.findByGymIdAndRole(gymId, Role.MEMBER);
        for (User member : members) {
            if (!memberLeadRepository.existsByMemberIdAndGymId(member.getId(), gymId)) {
                MemberLeadStatus status = calculateStatus(member.getSubscriptionEndDate());
                memberLeadRepository.save(MemberLead.builder()
                        .gymId(gymId)
                        .memberId(member.getId())
                        .email(member.getEmail())
                        .name(member.getName())
                        .phoneNumber(member.getPhone() != null ? member.getPhone() : "")
                        .type(MemberLeadType.MEMBER)
                        .status(status)
                        .subscriptionStartDate(member.getSubscriptionStartDate())
                        .subscriptionEndDate(member.getSubscriptionEndDate())
                        .createdBy(systemUserId)
                        .build());
            }
        }
    }
}
