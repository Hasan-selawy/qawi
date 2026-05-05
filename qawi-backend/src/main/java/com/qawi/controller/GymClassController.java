package com.qawi.controller;

import com.qawi.entity.*;
import com.qawi.exception.AppException;
import com.qawi.repository.*;
import com.qawi.service.GymAdminService;
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
@RequestMapping("/api/v1/admin/classes")
@PreAuthorize("hasRole('GYM_ADMIN')")
@RequiredArgsConstructor
public class GymClassController {

    private final GymClassRepository gymClassRepository;
    private final ClassBookingRepository classBookingRepository;
    private final UserRepository userRepository;
    private final GymAdminService gymAdminService;
    private final GymFeatureService gymFeatureService;

    private UUID getGymId(String email) {
        return gymAdminService.getGymIdForAdmin(email);
    }

    private void requireClassBooking(UUID gymId) {
        if (!gymFeatureService.isEnabledForGymId(gymId, GymFeatureService.Feature.CLASS_BOOKING)) {
            throw new AppException("Class booking is not enabled for this gym",
                    "حجز الحصص غير مفعّل لهذه الصالة", HttpStatus.FORBIDDEN);
        }
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listClasses(
            @AuthenticationPrincipal UserDetails ud) {
        UUID gymId = getGymId(ud.getUsername());
        requireClassBooking(gymId);
        List<GymClass> classes = gymClassRepository.findByGymIdOrderByDateTimeAsc(gymId);
        List<Map<String, Object>> result = classes.stream().map(c -> buildClassResponse(c, true)).toList();
        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createClass(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails ud) {
        UUID gymId = getGymId(ud.getUsername());
        requireClassBooking(gymId);
        GymClass gc = GymClass.builder()
                .gymId(gymId)
                .name(String.valueOf(body.get("name")))
                .instructorName(String.valueOf(body.get("instructorName")))
                .dateTime(LocalDateTime.parse(String.valueOf(body.get("dateTime"))))
                .durationMinutes(Integer.parseInt(String.valueOf(body.get("durationMinutes"))))
                .maxCapacity(Integer.parseInt(String.valueOf(body.get("maxCapacity"))))
                .description(body.get("description") != null ? String.valueOf(body.get("description")) : null)
                .build();
        gymClassRepository.save(gc);
        return ResponseEntity.status(HttpStatus.CREATED).body(buildClassResponse(gc, false));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateClass(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails ud) {
        UUID gymId = getGymId(ud.getUsername());
        requireClassBooking(gymId);
        GymClass gc = gymClassRepository.findById(id)
                .orElseThrow(() -> new AppException("Class not found", "الحصة غير موجودة", HttpStatus.NOT_FOUND));
        if (!gc.getGymId().equals(gymId))
            throw new AppException("Not found", "غير موجود", HttpStatus.NOT_FOUND);
        if (body.containsKey("name")) gc.setName(String.valueOf(body.get("name")));
        if (body.containsKey("instructorName")) gc.setInstructorName(String.valueOf(body.get("instructorName")));
        if (body.containsKey("dateTime")) gc.setDateTime(LocalDateTime.parse(String.valueOf(body.get("dateTime"))));
        if (body.containsKey("durationMinutes")) gc.setDurationMinutes(Integer.parseInt(String.valueOf(body.get("durationMinutes"))));
        if (body.containsKey("maxCapacity")) gc.setMaxCapacity(Integer.parseInt(String.valueOf(body.get("maxCapacity"))));
        if (body.containsKey("description")) gc.setDescription(String.valueOf(body.get("description")));
        gymClassRepository.save(gc);
        return ResponseEntity.ok(buildClassResponse(gc, true));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> cancelClass(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails ud) {
        UUID gymId = getGymId(ud.getUsername());
        requireClassBooking(gymId);
        GymClass gc = gymClassRepository.findById(id)
                .orElseThrow(() -> new AppException("Class not found", "الحصة غير موجودة", HttpStatus.NOT_FOUND));
        if (!gc.getGymId().equals(gymId))
            throw new AppException("Not found", "غير موجود", HttpStatus.NOT_FOUND);
        gc.setStatus(GymClassStatus.CANCELLED);
        gymClassRepository.save(gc);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/bookings")
    public ResponseEntity<List<Map<String, Object>>> getBookings(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails ud) {
        UUID gymId = getGymId(ud.getUsername());
        requireClassBooking(gymId);
        GymClass gc = gymClassRepository.findById(id)
                .orElseThrow(() -> new AppException("Class not found", "الحصة غير موجودة", HttpStatus.NOT_FOUND));
        if (!gc.getGymId().equals(gymId))
            throw new AppException("Not found", "غير موجود", HttpStatus.NOT_FOUND);
        List<ClassBooking> bookings = classBookingRepository.findByClassId(id);
        List<Map<String, Object>> result = bookings.stream().map(b -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", b.getId());
            m.put("memberId", b.getMemberId());
            m.put("status", b.getStatus());
            m.put("bookedAt", b.getBookedAt());
            userRepository.findById(b.getMemberId()).ifPresent(u -> {
                m.put("memberName", u.getName());
                m.put("memberEmail", u.getEmail());
            });
            return m;
        }).toList();
        return ResponseEntity.ok(result);
    }

    private Map<String, Object> buildClassResponse(GymClass gc, boolean includeBookingCount) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", gc.getId());
        m.put("name", gc.getName());
        m.put("instructorName", gc.getInstructorName());
        m.put("dateTime", gc.getDateTime());
        m.put("durationMinutes", gc.getDurationMinutes());
        m.put("maxCapacity", gc.getMaxCapacity());
        m.put("description", gc.getDescription());
        m.put("status", gc.getStatus());
        m.put("createdAt", gc.getCreatedAt());
        if (includeBookingCount) {
            long booked = classBookingRepository.countByClassIdAndStatus(gc.getId(), ClassBookingStatus.BOOKED);
            m.put("bookedCount", booked);
            m.put("availableSpots", Math.max(0, gc.getMaxCapacity() - booked));
        }
        return m;
    }
}
