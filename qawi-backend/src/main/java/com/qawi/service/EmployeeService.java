package com.qawi.service;

import com.qawi.dto.EmployeeRequest;
import com.qawi.dto.EmployeeResponse;
import com.qawi.entity.Role;
import com.qawi.entity.User;
import com.qawi.exception.AppException;
import com.qawi.repository.CoachMemberRepository;
import com.qawi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EmployeeService {

    private static final Set<Role> STAFF_ROLES =
            Set.of(Role.COACH, Role.SALES, Role.RECEPTIONIST, Role.NUTRITIONIST);

    private final UserRepository userRepository;
    private final CoachMemberRepository coachMemberRepository;
    private final PasswordEncoder passwordEncoder;

    public List<EmployeeResponse> getEmployees(String callerEmail) {
        UUID gymId = getCallerGymId(callerEmail);
        return userRepository.findByGymIdAndRoleIn(gymId, STAFF_ROLES)
                .stream()
                .map(u -> {
                    int count = u.getRole() == Role.COACH
                            ? coachMemberRepository.findByCoachId(u.getId()).size()
                            : 0;
                    return EmployeeResponse.from(u, count);
                })
                .toList();
    }

    @Transactional
    public EmployeeResponse createEmployee(EmployeeRequest req, String callerEmail) {
        UUID gymId = getCallerGymId(callerEmail);

        if (!STAFF_ROLES.contains(req.getRole())) {
            throw new AppException("Role not allowed", "الدور غير مسموح به", HttpStatus.BAD_REQUEST);
        }
        if (userRepository.existsByEmail(req.getEmail().toLowerCase().trim())) {
            throw new AppException("Email already registered", "البريد الإلكتروني مسجل مسبقاً", HttpStatus.CONFLICT);
        }

        String tempPassword = null;
        String rawPassword = req.getPassword();
        if (rawPassword == null || rawPassword.isBlank()) {
            tempPassword = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
            rawPassword = tempPassword;
        }

        User employee = User.builder()
                .name(req.getName().trim())
                .email(req.getEmail().toLowerCase().trim())
                .password(passwordEncoder.encode(rawPassword))
                .role(req.getRole())
                .gymId(gymId)
                .phone(req.getPhoneNumber())
                .isActive(true)
                .build();

        userRepository.save(employee);

        EmployeeResponse resp = EmployeeResponse.from(employee, 0);
        resp.setTemporaryPassword(tempPassword);
        return resp;
    }

    @Transactional
    public EmployeeResponse toggleStatus(UUID id, String callerEmail) {
        UUID gymId = getCallerGymId(callerEmail);
        User employee = userRepository.findById(id)
                .filter(u -> gymId.equals(u.getGymId()) && STAFF_ROLES.contains(u.getRole()))
                .orElseThrow(() -> new AppException("Employee not found", "الموظف غير موجود", HttpStatus.NOT_FOUND));
        employee.setActive(!employee.isActive());
        userRepository.save(employee);
        int count = employee.getRole() == Role.COACH
                ? coachMemberRepository.findByCoachId(employee.getId()).size() : 0;
        return EmployeeResponse.from(employee, count);
    }

    @Transactional
    public void deleteEmployee(UUID id, String callerEmail) {
        UUID gymId = getCallerGymId(callerEmail);
        User employee = userRepository.findById(id)
                .filter(u -> gymId.equals(u.getGymId()) && STAFF_ROLES.contains(u.getRole()))
                .orElseThrow(() -> new AppException("Employee not found", "الموظف غير موجود", HttpStatus.NOT_FOUND));
        userRepository.delete(employee);
    }

    private UUID getCallerGymId(String email) {
        return userRepository.findByEmail(email)
                .map(User::getGymId)
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));
    }
}
