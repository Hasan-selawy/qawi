package com.qawi.gym.service;

import com.qawi.gym.dto.request.AttendanceRequest;
import com.qawi.gym.dto.response.AttendanceResponse;
import com.qawi.gym.dto.response.PageResponse;
import com.qawi.gym.entity.Attendance;
import com.qawi.gym.entity.Gym;
import com.qawi.gym.entity.Member;
import com.qawi.gym.exception.BadRequestException;
import com.qawi.gym.exception.ResourceNotFoundException;
import com.qawi.gym.repository.AttendanceRepository;
import com.qawi.gym.repository.GymRepository;
import com.qawi.gym.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final MemberRepository memberRepository;
    private final GymRepository gymRepository;

    @Transactional
    public AttendanceResponse checkIn(AttendanceRequest request) {
        Member member = memberRepository.findById(request.getMemberId())
                .orElseThrow(() -> new ResourceNotFoundException("Member", request.getMemberId()));

        Gym gym = gymRepository.findById(request.getGymId())
                .orElseThrow(() -> new ResourceNotFoundException("Gym", request.getGymId()));

        attendanceRepository.findOpenSession(request.getMemberId())
                .ifPresent(a -> { throw new BadRequestException("Member already has an open check-in session"); });

        Attendance attendance = Attendance.builder()
                .member(member)
                .gym(gym)
                .checkInTime(LocalDateTime.now())
                .notes(request.getNotes())
                .build();

        return toResponse(attendanceRepository.save(attendance));
    }

    @Transactional
    public AttendanceResponse checkOut(Long memberId) {
        Attendance attendance = attendanceRepository.findOpenSession(memberId)
                .orElseThrow(() -> new BadRequestException("No open check-in session found for this member"));

        attendance.setCheckOutTime(LocalDateTime.now());
        return toResponse(attendanceRepository.save(attendance));
    }

    @Transactional(readOnly = true)
    public PageResponse<AttendanceResponse> getMemberAttendance(Long memberId, Pageable pageable) {
        Page<AttendanceResponse> page = attendanceRepository.findByMemberId(memberId, pageable)
                .map(this::toResponse);
        return PageResponse.from(page);
    }

    @Transactional(readOnly = true)
    public PageResponse<AttendanceResponse> getGymAttendance(Long gymId, Pageable pageable) {
        Page<AttendanceResponse> page = attendanceRepository.findByGymId(gymId, pageable)
                .map(this::toResponse);
        return PageResponse.from(page);
    }

    @Transactional(readOnly = true)
    public long countGymAttendance(Long gymId, LocalDateTime from, LocalDateTime to) {
        return attendanceRepository.countByGymIdAndDateRange(gymId, from, to);
    }

    private AttendanceResponse toResponse(Attendance a) {
        Long durationMinutes = null;
        if (a.getCheckOutTime() != null) {
            durationMinutes = Duration.between(a.getCheckInTime(), a.getCheckOutTime()).toMinutes();
        }
        return AttendanceResponse.builder()
                .id(a.getId())
                .memberId(a.getMember().getId())
                .memberName(a.getMember().getUser().getFullName())
                .memberCode(a.getMember().getMemberCode())
                .gymId(a.getGym().getId())
                .checkInTime(a.getCheckInTime())
                .checkOutTime(a.getCheckOutTime())
                .notes(a.getNotes())
                .durationMinutes(durationMinutes)
                .build();
    }
}
