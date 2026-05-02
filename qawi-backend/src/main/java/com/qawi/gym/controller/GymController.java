package com.qawi.gym.controller;

import com.qawi.gym.dto.request.GymRequest;
import com.qawi.gym.dto.response.ApiResponse;
import com.qawi.gym.dto.response.GymResponse;
import com.qawi.gym.dto.response.PageResponse;
import com.qawi.gym.entity.User;
import com.qawi.gym.entity.enums.GymStatus;
import com.qawi.gym.service.GymService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/gyms")
@RequiredArgsConstructor
public class GymController {

    private final GymService gymService;

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'GYM_OWNER')")
    public ResponseEntity<ApiResponse<GymResponse>> createGym(
            @Valid @RequestBody GymRequest request,
            @AuthenticationPrincipal User user) {
        GymResponse response = gymService.createGym(request, user.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Gym created successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<GymResponse>> getGym(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(gymService.getGym(id)));
    }

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<GymResponse>>> getAllGyms(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(ApiResponse.success(gymService.getAllGyms(pageable)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'GYM_OWNER')")
    public ResponseEntity<ApiResponse<GymResponse>> updateGym(
            @PathVariable Long id,
            @Valid @RequestBody GymRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Gym updated", gymService.updateGym(id, request)));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> updateGymStatus(
            @PathVariable Long id,
            @RequestParam GymStatus status) {
        gymService.updateGymStatus(id, status);
        return ResponseEntity.ok(ApiResponse.success("Status updated", null));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteGym(@PathVariable Long id) {
        gymService.deleteGym(id);
        return ResponseEntity.ok(ApiResponse.success("Gym deleted", null));
    }
}
