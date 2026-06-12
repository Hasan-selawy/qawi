package com.qawi.controller;

import com.qawi.entity.Role;
import com.qawi.entity.User;
import com.qawi.exception.AppException;
import com.qawi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/gym")
@PreAuthorize("hasAnyRole('GYM_ADMIN','RECEPTIONIST','SALES','COACH','NUTRITIONIST')")
@RequiredArgsConstructor
public class GymSharedController {

    private final UserRepository userRepository;

    /**
     * Returns the list of active coaches in the caller's gym.
     * Accessible to GYM_ADMIN, RECEPTIONIST, SALES, COACH, and NUTRITIONIST.
     * Returns only id / name / email — no sensitive fields.
     */
    @GetMapping("/coaches")
    public ResponseEntity<List<Map<String, Object>>> getCoaches(
            @AuthenticationPrincipal UserDetails ud) {
        User caller = userRepository.findByEmail(ud.getUsername())
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));
        if (caller.getGymId() == null) {
            return ResponseEntity.ok(List.of());
        }
        List<Map<String, Object>> result = userRepository
                .findByGymIdAndRole(caller.getGymId(), Role.COACH)
                .stream()
                .map(c -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", c.getId().toString());
                    m.put("name", c.getName());
                    m.put("email", c.getEmail());
                    return m;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }
}
