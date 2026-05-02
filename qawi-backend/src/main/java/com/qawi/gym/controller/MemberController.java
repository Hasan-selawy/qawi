package com.qawi.gym.controller;

import com.qawi.gym.dto.request.MemberRequest;
import com.qawi.gym.dto.response.ApiResponse;
import com.qawi.gym.dto.response.MemberResponse;
import com.qawi.gym.dto.response.PageResponse;
import com.qawi.gym.entity.enums.MemberStatus;
import com.qawi.gym.service.MemberService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/members")
@RequiredArgsConstructor
public class MemberController {

    private final MemberService memberService;

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'GYM_OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<MemberResponse>> createMember(@Valid @RequestBody MemberRequest request) {
        MemberResponse response = memberService.createMember(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Member created successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<MemberResponse>> getMember(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(memberService.getMember(id)));
    }

    @GetMapping("/code/{code}")
    public ResponseEntity<ApiResponse<MemberResponse>> getMemberByCode(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.success(memberService.getMemberByCode(code)));
    }

    @GetMapping("/gym/{gymId}")
    public ResponseEntity<ApiResponse<PageResponse<MemberResponse>>> getGymMembers(
            @PathVariable Long gymId,
            @RequestParam(required = false) MemberStatus status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(ApiResponse.success(
                memberService.getMembersByGym(gymId, status, search, pageable)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'GYM_OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<MemberResponse>> updateMember(
            @PathVariable Long id,
            @Valid @RequestBody MemberRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Member updated", memberService.updateMember(id, request)));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'GYM_OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<Void>> updateMemberStatus(
            @PathVariable Long id,
            @RequestParam MemberStatus status) {
        memberService.updateMemberStatus(id, status);
        return ResponseEntity.ok(ApiResponse.success("Status updated", null));
    }
}
