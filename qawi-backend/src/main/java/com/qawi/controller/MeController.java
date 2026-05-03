package com.qawi.controller;

import com.qawi.entity.Gym;
import com.qawi.service.GymFeatureService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Endpoints scoped to the currently-authenticated user (any role).
 */
@RestController
@RequestMapping("/api/v1/me")
@RequiredArgsConstructor
public class MeController {

    private final GymFeatureService gymFeatureService;

    @GetMapping("/gym-config")
    public ResponseEntity<Map<String, Object>> gymConfig(@AuthenticationPrincipal UserDetails ud) {
        Gym gym = gymFeatureService.getGymForUser(ud.getUsername());
        return ResponseEntity.ok(gymFeatureService.publicConfig(gym));
    }
}
