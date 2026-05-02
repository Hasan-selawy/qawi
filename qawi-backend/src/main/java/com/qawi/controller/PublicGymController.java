package com.qawi.controller;

import com.qawi.dto.*;
import com.qawi.service.PublicGymService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/public")
@RequiredArgsConstructor
public class PublicGymController {

    private final PublicGymService publicGymService;

    @PostMapping("/register-gym")
    public ResponseEntity<RegisterGymResponse> registerGym(@Valid @RequestBody RegisterGymRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(publicGymService.registerGym(request));
    }

    @GetMapping("/plans")
    public ResponseEntity<List<PlanInfo>> getPlans() {
        return ResponseEntity.ok(publicGymService.getPlans());
    }

    @PostMapping("/check-email")
    public ResponseEntity<Map<String, Boolean>> checkEmail(@Valid @RequestBody CheckEmailRequest request) {
        boolean available = publicGymService.isEmailAvailable(request.getEmail());
        return ResponseEntity.ok(Map.of("available", available));
    }
}
