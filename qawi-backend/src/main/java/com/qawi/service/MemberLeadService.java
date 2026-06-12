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

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MemberLeadService {

    private final MemberLeadRepository memberLeadRepository;
    private final UserRepository userRepository;
    private final GymRepository gymRepository;
    private final CoachMemberRepository coachMemberRepository;
    private final PasswordEncoder passwordEncoder;

    private User getCallerUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));
    }

    public List<MemberLeadResponse> getLeads(String callerEmail) {
        UUID gymId = getCallerUser(callerEmail).getGymId();
        return memberLeadRepository.findByGymIdOrderByCreatedAtDesc(gymId)
                .stream().map(MemberLeadResponse::from).toList();
    }

    @Transactional
    public MemberLeadResponse createLead(MemberLeadRequest req, String callerEmail) {
        User caller = getCallerUser(callerEmail);
        MemberLead lead = MemberLead.builder()
                .gymId(caller.getGymId())
                .name(req.getName())
                .phoneNumber(req.getPhoneNumber())
                .notes(req.getNotes())
                .createdBy(caller.getId())
                .build();
        return MemberLeadResponse.from(memberLeadRepository.save(lead));
    }

    @Transactional
    public MemberLeadResponse updateLead(UUID id, MemberLeadUpdateRequest req, String callerEmail) {
        UUID gymId = getCallerUser(callerEmail).getGymId();
        MemberLead lead = findLeadInGym(id, gymId);
        lead.setStatus(req.getStatus());
        if (req.getNotes() != null) lead.setNotes(req.getNotes());
        lead.setLastUpdatedAt(LocalDateTime.now());
        return MemberLeadResponse.from(memberLeadRepository.save(lead));
    }

    @Transactional
    public void deleteLead(UUID id, String callerEmail) {
        UUID gymId = getCallerUser(callerEmail).getGymId();
        MemberLead lead = findLeadInGym(id, gymId);
        memberLeadRepository.delete(lead);
    }

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

        User member = userRepository.save(User.builder()
                .name(lead.getName())
                .email(req.getEmail())
                .password(passwordEncoder.encode(req.getPassword()))
                .role(Role.MEMBER)
                .gymId(gymId)
                .subscriptionEndDate(req.getSubscriptionEndDate())
                .build());

        if (req.getCoachId() != null) {
            userRepository.findById(req.getCoachId()).ifPresent(coach ->
                    coachMemberRepository.save(CoachMember.builder()
                            .coachId(coach.getId())
                            .memberId(member.getId())
                            .build()));
        }

        memberLeadRepository.delete(lead);
        return member;
    }

    private MemberLead findLeadInGym(UUID id, UUID gymId) {
        MemberLead lead = memberLeadRepository.findById(id)
                .orElseThrow(() -> new AppException("Lead not found", "العميل المحتمل غير موجود", HttpStatus.NOT_FOUND));
        if (!lead.getGymId().equals(gymId)) {
            throw new AppException("Access denied", "غير مصرح", HttpStatus.FORBIDDEN);
        }
        return lead;
    }
}
