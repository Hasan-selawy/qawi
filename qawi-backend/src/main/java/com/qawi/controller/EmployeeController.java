package com.qawi.controller;

import com.qawi.dto.EmployeeRequest;
import com.qawi.dto.EmployeeResponse;
import com.qawi.service.EmployeeService;
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
@RequestMapping("/api/v1/admin/employees")
@PreAuthorize("hasRole('GYM_ADMIN')")
@RequiredArgsConstructor
public class EmployeeController {

    private final EmployeeService employeeService;

    @GetMapping
    public ResponseEntity<List<EmployeeResponse>> getEmployees(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(employeeService.getEmployees(userDetails.getUsername()));
    }

    @PostMapping
    public ResponseEntity<EmployeeResponse> createEmployee(
            @Valid @RequestBody EmployeeRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(employeeService.createEmployee(req, userDetails.getUsername()));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<EmployeeResponse> toggleStatus(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(employeeService.toggleStatus(id, userDetails.getUsername()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEmployee(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails) {
        employeeService.deleteEmployee(id, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }
}
