package com.qawi.controller;

import com.qawi.dto.CreateProgressPhotoRequest;
import com.qawi.entity.ProgressPhoto;
import com.qawi.service.ProgressPhotoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/photos")
@RequiredArgsConstructor
public class ProgressPhotoController {

    private final ProgressPhotoService photoService;

    @PostMapping
    @PreAuthorize("hasRole('MEMBER')")
    public ResponseEntity<ProgressPhoto> addPhoto(
            @Valid @RequestBody CreateProgressPhotoRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(photoService.addPhoto(request, userDetails.getUsername()));
    }

    @GetMapping("/member/{memberId}")
    public ResponseEntity<List<ProgressPhoto>> getByMember(@PathVariable UUID memberId) {
        return ResponseEntity.ok(photoService.getByMember(memberId));
    }

    @DeleteMapping("/{photoId}")
    @PreAuthorize("hasRole('MEMBER')")
    public ResponseEntity<Void> deletePhoto(
            @PathVariable UUID photoId,
            @AuthenticationPrincipal UserDetails userDetails) {
        photoService.deletePhoto(photoId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }
}
