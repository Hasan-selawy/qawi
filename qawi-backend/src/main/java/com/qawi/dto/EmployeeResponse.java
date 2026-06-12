package com.qawi.dto;

import com.qawi.entity.Role;
import com.qawi.entity.User;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class EmployeeResponse {
    private UUID id;
    private String name;
    private String email;
    private String phoneNumber;
    private Role role;
    private boolean active;
    private LocalDateTime createdAt;
    private int memberCount;
    private String temporaryPassword;

    public static EmployeeResponse from(User u, int memberCount) {
        EmployeeResponse r = new EmployeeResponse();
        r.id = u.getId();
        r.name = u.getName();
        r.email = u.getEmail();
        r.phoneNumber = u.getPhone();
        r.role = u.getRole();
        r.active = u.isActive();
        r.createdAt = u.getCreatedAt();
        r.memberCount = memberCount;
        return r;
    }
}
