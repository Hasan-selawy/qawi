package com.qawi.gym.service;

import com.qawi.gym.dto.request.GymClassRequest;
import com.qawi.gym.dto.response.GymClassResponse;
import com.qawi.gym.dto.response.PageResponse;
import com.qawi.gym.entity.ClassBooking;
import com.qawi.gym.entity.Gym;
import com.qawi.gym.entity.GymClass;
import com.qawi.gym.entity.Member;
import com.qawi.gym.entity.User;
import com.qawi.gym.entity.enums.BookingStatus;
import com.qawi.gym.entity.enums.ClassStatus;
import com.qawi.gym.exception.BadRequestException;
import com.qawi.gym.exception.ConflictException;
import com.qawi.gym.exception.ResourceNotFoundException;
import com.qawi.gym.repository.ClassBookingRepository;
import com.qawi.gym.repository.GymClassRepository;
import com.qawi.gym.repository.GymRepository;
import com.qawi.gym.repository.MemberRepository;
import com.qawi.gym.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class GymClassService {

    private final GymClassRepository classRepository;
    private final ClassBookingRepository bookingRepository;
    private final GymRepository gymRepository;
    private final MemberRepository memberRepository;
    private final UserRepository userRepository;

    @Transactional
    public GymClassResponse createClass(Long gymId, GymClassRequest request) {
        Gym gym = gymRepository.findById(gymId)
                .orElseThrow(() -> new ResourceNotFoundException("Gym", gymId));

        User trainer = null;
        if (request.getTrainerId() != null) {
            trainer = userRepository.findById(request.getTrainerId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", request.getTrainerId()));
        }

        GymClass gymClass = GymClass.builder()
                .gym(gym)
                .name(request.getName())
                .nameAr(request.getNameAr())
                .description(request.getDescription())
                .trainer(trainer)
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .maxCapacity(request.getMaxCapacity())
                .location(request.getLocation())
                .build();

        return toResponse(classRepository.save(gymClass));
    }

    @Transactional(readOnly = true)
    public PageResponse<GymClassResponse> getGymClasses(Long gymId, Pageable pageable) {
        Page<GymClassResponse> page = classRepository.findByGymId(gymId, pageable).map(this::toResponse);
        return PageResponse.from(page);
    }

    @Transactional(readOnly = true)
    public List<GymClassResponse> getGymClassesByDateRange(Long gymId, LocalDateTime from, LocalDateTime to) {
        return classRepository.findByGymIdAndDateRange(gymId, from, to).stream().map(this::toResponse).toList();
    }

    @Transactional
    public GymClassResponse updateClass(Long id, GymClassRequest request) {
        GymClass gymClass = classRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("GymClass", id));

        gymClass.setName(request.getName());
        if (request.getNameAr() != null) gymClass.setNameAr(request.getNameAr());
        if (request.getDescription() != null) gymClass.setDescription(request.getDescription());
        if (request.getStartTime() != null) gymClass.setStartTime(request.getStartTime());
        if (request.getEndTime() != null) gymClass.setEndTime(request.getEndTime());
        if (request.getMaxCapacity() != null) gymClass.setMaxCapacity(request.getMaxCapacity());
        if (request.getLocation() != null) gymClass.setLocation(request.getLocation());

        return toResponse(classRepository.save(gymClass));
    }

    @Transactional
    public void cancelClass(Long id) {
        GymClass gymClass = classRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("GymClass", id));
        gymClass.setStatus(ClassStatus.CANCELLED);
        classRepository.save(gymClass);
    }

    @Transactional
    public ClassBooking bookClass(Long classId, Long memberId) {
        GymClass gymClass = classRepository.findById(classId)
                .orElseThrow(() -> new ResourceNotFoundException("GymClass", classId));

        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("Member", memberId));

        if (bookingRepository.existsByMemberIdAndGymClassId(memberId, classId)) {
            throw new ConflictException("Member already booked this class");
        }

        long confirmedCount = bookingRepository.countByClassIdAndStatus(classId, BookingStatus.CONFIRMED);
        BookingStatus status = confirmedCount < gymClass.getMaxCapacity()
                ? BookingStatus.CONFIRMED : BookingStatus.WAITLISTED;

        if (gymClass.getStatus() == ClassStatus.CANCELLED) {
            throw new BadRequestException("Cannot book a cancelled class");
        }

        ClassBooking booking = ClassBooking.builder()
                .member(member)
                .gymClass(gymClass)
                .status(status)
                .bookedAt(LocalDateTime.now())
                .build();

        return bookingRepository.save(booking);
    }

    @Transactional
    public void cancelBooking(Long classId, Long memberId) {
        ClassBooking booking = bookingRepository.findByMemberIdAndGymClassId(memberId, classId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));
        booking.setStatus(BookingStatus.CANCELLED);
        bookingRepository.save(booking);
    }

    private GymClassResponse toResponse(GymClass gc) {
        long bookedCount = bookingRepository.countByClassIdAndStatus(gc.getId(), BookingStatus.CONFIRMED);
        return GymClassResponse.builder()
                .id(gc.getId())
                .gymId(gc.getGym().getId())
                .name(gc.getName())
                .nameAr(gc.getNameAr())
                .description(gc.getDescription())
                .trainerId(gc.getTrainer() != null ? gc.getTrainer().getId() : null)
                .trainerName(gc.getTrainer() != null ? gc.getTrainer().getFullName() : null)
                .startTime(gc.getStartTime())
                .endTime(gc.getEndTime())
                .maxCapacity(gc.getMaxCapacity())
                .bookedCount(bookedCount)
                .status(gc.getStatus())
                .location(gc.getLocation())
                .createdAt(gc.getCreatedAt())
                .build();
    }
}
