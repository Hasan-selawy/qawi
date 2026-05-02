package com.qawi.gym.service;

import com.qawi.gym.dto.request.MemberRequest;
import com.qawi.gym.dto.response.MemberResponse;
import com.qawi.gym.dto.response.PageResponse;
import com.qawi.gym.entity.Gym;
import com.qawi.gym.entity.Member;
import com.qawi.gym.entity.User;
import com.qawi.gym.entity.enums.MemberStatus;
import com.qawi.gym.entity.enums.Role;
import com.qawi.gym.exception.ConflictException;
import com.qawi.gym.exception.ResourceNotFoundException;
import com.qawi.gym.repository.GymRepository;
import com.qawi.gym.repository.MemberRepository;
import com.qawi.gym.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MemberService {

    private final MemberRepository memberRepository;
    private final UserRepository userRepository;
    private final GymRepository gymRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public MemberResponse createMember(MemberRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("Email already in use: " + request.getEmail());
        }

        Gym gym = gymRepository.findById(request.getGymId())
                .orElseThrow(() -> new ResourceNotFoundException("Gym", request.getGymId()));

        String password = request.getPassword() != null ? request.getPassword() : "Qawi@2024";

        User user = User.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(password))
                .phone(request.getPhone())
                .role(Role.MEMBER)
                .gymId(request.getGymId())
                .build();
        userRepository.save(user);

        String memberCode = generateMemberCode(gym);

        Member member = Member.builder()
                .gym(gym)
                .user(user)
                .memberCode(memberCode)
                .dateOfBirth(request.getDateOfBirth())
                .gender(request.getGender())
                .profilePhotoUrl(request.getProfilePhotoUrl())
                .emergencyContactName(request.getEmergencyContactName())
                .emergencyContactPhone(request.getEmergencyContactPhone())
                .healthNotes(request.getHealthNotes())
                .build();

        return toResponse(memberRepository.save(member));
    }

    @Transactional(readOnly = true)
    public MemberResponse getMember(Long id) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Member", id));
        return toResponse(member);
    }

    @Transactional(readOnly = true)
    public MemberResponse getMemberByCode(String code) {
        Member member = memberRepository.findByMemberCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found with code: " + code));
        return toResponse(member);
    }

    @Transactional(readOnly = true)
    public PageResponse<MemberResponse> getMembersByGym(Long gymId, MemberStatus status, String search, Pageable pageable) {
        Page<MemberResponse> page;
        if (search != null && !search.isBlank()) {
            page = memberRepository.searchMembers(gymId, search, pageable).map(this::toResponse);
        } else if (status != null) {
            page = memberRepository.findByGymIdAndStatus(gymId, status, pageable).map(this::toResponse);
        } else {
            page = memberRepository.findByGymId(gymId, pageable).map(this::toResponse);
        }
        return PageResponse.from(page);
    }

    @Transactional
    public MemberResponse updateMember(Long id, MemberRequest request) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Member", id));

        User user = member.getUser();
        if (request.getFirstName() != null) user.setFirstName(request.getFirstName());
        if (request.getLastName() != null) user.setLastName(request.getLastName());
        if (request.getPhone() != null) user.setPhone(request.getPhone());
        userRepository.save(user);

        if (request.getDateOfBirth() != null) member.setDateOfBirth(request.getDateOfBirth());
        if (request.getGender() != null) member.setGender(request.getGender());
        if (request.getProfilePhotoUrl() != null) member.setProfilePhotoUrl(request.getProfilePhotoUrl());
        if (request.getEmergencyContactName() != null) member.setEmergencyContactName(request.getEmergencyContactName());
        if (request.getEmergencyContactPhone() != null) member.setEmergencyContactPhone(request.getEmergencyContactPhone());
        if (request.getHealthNotes() != null) member.setHealthNotes(request.getHealthNotes());

        return toResponse(memberRepository.save(member));
    }

    @Transactional
    public void updateMemberStatus(Long id, MemberStatus status) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Member", id));
        member.setStatus(status);
        memberRepository.save(member);
    }

    private String generateMemberCode(Gym gym) {
        String prefix = gym.getName().substring(0, Math.min(3, gym.getName().length())).toUpperCase();
        String suffix = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        return prefix + "-" + suffix;
    }

    private MemberResponse toResponse(Member member) {
        User user = member.getUser();
        return MemberResponse.builder()
                .id(member.getId())
                .memberCode(member.getMemberCode())
                .gymId(member.getGym().getId())
                .gymName(member.getGym().getName())
                .userId(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .dateOfBirth(member.getDateOfBirth())
                .gender(member.getGender())
                .profilePhotoUrl(member.getProfilePhotoUrl())
                .emergencyContactName(member.getEmergencyContactName())
                .emergencyContactPhone(member.getEmergencyContactPhone())
                .healthNotes(member.getHealthNotes())
                .status(member.getStatus())
                .createdAt(member.getCreatedAt())
                .build();
    }
}
