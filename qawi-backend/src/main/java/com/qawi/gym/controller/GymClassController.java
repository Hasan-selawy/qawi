package com.qawi.gym.controller;

import com.qawi.gym.dto.request.GymClassRequest;
import com.qawi.gym.dto.response.ApiResponse;
import com.qawi.gym.dto.response.GymClassResponse;
import com.qawi.gym.dto.response.PageResponse;
import com.qawi.gym.service.GymClassService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/gyms/{gymId}/classes")
@RequiredArgsConstructor
public class GymClassController {

    private final GymClassService classService;

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'GYM_OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<GymClassResponse>> createClass(
            @PathVariable Long gymId,
            @Valid @RequestBody GymClassRequest request) {
        GymClassResponse response = classService.createClass(gymId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Class created", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<GymClassResponse>>> getGymClasses(
            @PathVariable Long gymId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("startTime").ascending());
        return ResponseEntity.ok(ApiResponse.success(classService.getGymClasses(gymId, pageable)));
    }

    @GetMapping("/schedule")
    public ResponseEntity<ApiResponse<List<GymClassResponse>>> getClassSchedule(
            @PathVariable Long gymId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        return ResponseEntity.ok(ApiResponse.success(classService.getGymClassesByDateRange(gymId, from, to)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'GYM_OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<GymClassResponse>> updateClass(
            @PathVariable Long gymId,
            @PathVariable Long id,
            @Valid @RequestBody GymClassRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Class updated", classService.updateClass(id, request)));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'GYM_OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<Void>> cancelClass(@PathVariable Long gymId, @PathVariable Long id) {
        classService.cancelClass(id);
        return ResponseEntity.ok(ApiResponse.success("Class cancelled", null));
    }

    @PostMapping("/{classId}/book/{memberId}")
    public ResponseEntity<ApiResponse<Void>> bookClass(
            @PathVariable Long gymId,
            @PathVariable Long classId,
            @PathVariable Long memberId) {
        classService.bookClass(classId, memberId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Class booked", null));
    }

    @DeleteMapping("/{classId}/book/{memberId}")
    public ResponseEntity<ApiResponse<Void>> cancelBooking(
            @PathVariable Long gymId,
            @PathVariable Long classId,
            @PathVariable Long memberId) {
        classService.cancelBooking(classId, memberId);
        return ResponseEntity.ok(ApiResponse.success("Booking cancelled", null));
    }
}
