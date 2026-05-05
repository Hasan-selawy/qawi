package com.qawi.controller;

import com.qawi.entity.*;
import com.qawi.exception.AppException;
import com.qawi.repository.*;
import com.qawi.service.GymFeatureService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/member/classes")
@PreAuthorize("hasRole('MEMBER')")
@RequiredArgsConstructor
public class MemberClassController {

    private final GymClassRepository gymClassRepository;
    private final ClassBookingRepository classBookingRepository;
    private final UserRepository userRepository;
    private final GymFeatureService gymFeatureService;

    private User getMember(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));
    }

    private void requireClassBooking(UUID gymId) {
        if (!gymFeatureService.isEnabledForGymId(gymId, GymFeatureService.Feature.CLASS_BOOKING)) {
            throw new AppException("Class booking is not enabled", "حجز الحصص غير مفعّل", HttpStatus.FORBIDDEN);
        }
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getUpcomingClasses(
            @AuthenticationPrincipal UserDetails ud) {
        User member = getMember(ud.getUsername());
        requireClassBooking(member.getGymId());
        List<GymClass> classes = gymClassRepository.findByGymIdAndStatusAndDateTimeAfterOrderByDateTimeAsc(
                member.getGymId(), GymClassStatus.ACTIVE, LocalDateTime.now().minusHours(1));
        List<Map<String, Object>> result = classes.stream().map(c -> buildClassResponse(c, member.getId())).toList();
        return ResponseEntity.ok(result);
    }

    @GetMapping("/my-bookings")
    public ResponseEntity<List<Map<String, Object>>> getMyBookings(
            @AuthenticationPrincipal UserDetails ud) {
        User member = getMember(ud.getUsername());
        requireClassBooking(member.getGymId());
        List<ClassBooking> bookings = classBookingRepository.findByMemberIdAndStatus(member.getId(), ClassBookingStatus.BOOKED);
        List<Map<String, Object>> result = bookings.stream().map(b -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("bookingId", b.getId());
            m.put("bookedAt", b.getBookedAt());
            m.put("status", b.getStatus());
            gymClassRepository.findById(b.getClassId()).ifPresent(gc -> {
                m.put("class", buildClassResponse(gc, member.getId()));
            });
            return m;
        }).toList();
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{classId}/book")
    @Transactional
    public ResponseEntity<Map<String, Object>> bookClass(
            @PathVariable UUID classId,
            @AuthenticationPrincipal UserDetails ud) {
        User member = getMember(ud.getUsername());
        requireClassBooking(member.getGymId());

        GymClass gc = gymClassRepository.findById(classId)
                .orElseThrow(() -> new AppException("Class not found", "الحصة غير موجودة", HttpStatus.NOT_FOUND));
        if (!gc.getGymId().equals(member.getGymId()))
            throw new AppException("Class not found", "الحصة غير موجودة", HttpStatus.NOT_FOUND);
        if (gc.getStatus() == GymClassStatus.CANCELLED)
            throw new AppException("Class is cancelled", "تم إلغاء الحصة", HttpStatus.BAD_REQUEST);

        Optional<ClassBooking> existing = classBookingRepository.findByClassIdAndMemberId(classId, member.getId());
        if (existing.isPresent() && existing.get().getStatus() == ClassBookingStatus.BOOKED)
            throw new AppException("Already booked", "أنت محجوز بالفعل", HttpStatus.CONFLICT);

        long booked = classBookingRepository.countByClassIdAndStatus(classId, ClassBookingStatus.BOOKED);
        if (booked >= gc.getMaxCapacity())
            throw new AppException("Class is full", "الحصة ممتلئة", HttpStatus.CONFLICT);

        ClassBooking booking;
        if (existing.isPresent()) {
            booking = existing.get();
            booking.setStatus(ClassBookingStatus.BOOKED);
            booking.setBookedAt(LocalDateTime.now());
        } else {
            booking = ClassBooking.builder().classId(classId).memberId(member.getId()).build();
        }
        classBookingRepository.save(booking);

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("bookingId", booking.getId());
        resp.put("classId", classId);
        resp.put("status", "BOOKED");
        return ResponseEntity.status(HttpStatus.CREATED).body(resp);
    }

    @DeleteMapping("/{classId}/book")
    @Transactional
    public ResponseEntity<Void> cancelBooking(
            @PathVariable UUID classId,
            @AuthenticationPrincipal UserDetails ud) {
        User member = getMember(ud.getUsername());
        requireClassBooking(member.getGymId());

        ClassBooking booking = classBookingRepository.findByClassIdAndMemberId(classId, member.getId())
                .orElseThrow(() -> new AppException("Booking not found", "الحجز غير موجود", HttpStatus.NOT_FOUND));
        booking.setStatus(ClassBookingStatus.CANCELLED);
        classBookingRepository.save(booking);
        return ResponseEntity.noContent().build();
    }

    private Map<String, Object> buildClassResponse(GymClass gc, UUID memberId) {
        long booked = classBookingRepository.countByClassIdAndStatus(gc.getId(), ClassBookingStatus.BOOKED);
        Optional<ClassBooking> myBooking = classBookingRepository.findByClassIdAndMemberId(gc.getId(), memberId);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", gc.getId());
        m.put("name", gc.getName());
        m.put("instructorName", gc.getInstructorName());
        m.put("dateTime", gc.getDateTime());
        m.put("durationMinutes", gc.getDurationMinutes());
        m.put("maxCapacity", gc.getMaxCapacity());
        m.put("description", gc.getDescription());
        m.put("status", gc.getStatus());
        m.put("bookedCount", booked);
        m.put("availableSpots", Math.max(0, gc.getMaxCapacity() - booked));
        m.put("isFull", booked >= gc.getMaxCapacity());
        m.put("isBooked", myBooking.isPresent() && myBooking.get().getStatus() == ClassBookingStatus.BOOKED);
        return m;
    }
}
