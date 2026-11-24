package com.qawi.service;

import com.qawi.entity.CoachMember;
import com.qawi.entity.Role;
import com.qawi.entity.User;
import com.qawi.exception.AppException;
import com.qawi.repository.CoachMemberRepository;
import com.qawi.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DataJpaTest(properties = {
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false",
        "spring.jpa.open-in-view=false"
})
@Import({AccessGuard.class, EmployeeService.class, AccessGuardIntegrationTest.TestConfig.class})
class AccessGuardIntegrationTest {

    @Autowired
    private AccessGuard accessGuard;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CoachMemberRepository coachMemberRepository;

    @Autowired
    private EmployeeService employeeService;

    private UUID gymA;
    private UUID gymB;
    private User adminA;
    private User coachA;
    private User memberA;
    private User memberB;

    @BeforeEach
    void setUp() {
        gymA = UUID.randomUUID();
        gymB = UUID.randomUUID();
        adminA = saveUser("admin-a@qawi.test", Role.GYM_ADMIN, gymA);
        coachA = saveUser("coach-a@qawi.test", Role.COACH, gymA);
        memberA = saveUser("member-a@qawi.test", Role.MEMBER, gymA);
        memberB = saveUser("member-b@qawi.test", Role.MEMBER, gymB);
    }

    @Test
    void scopedRepositoryLookupCannotReturnAnotherGymsUser() {
        assertTrue(userRepository.findByIdAndGymId(memberA.getId(), gymA).isPresent());
        assertFalse(userRepository.findByIdAndGymId(memberB.getId(), gymA).isPresent());
    }

    @Test
    void tenantCallerCannotLoadAnotherGymsUser() {
        AppException error = assertThrows(AppException.class,
                () -> accessGuard.loadUserInCallerGym(adminA.getEmail(), memberB.getId()));

        assertEquals(HttpStatus.NOT_FOUND, error.getStatus());
    }

    @Test
    void everyTenantRoleCanUseBoundaryCheckWithoutReceivingDomainPermission() {
        for (Role role : new Role[] {
                Role.GYM_ADMIN, Role.RECEPTIONIST, Role.SALES, Role.NUTRITIONIST,
                Role.COACH, Role.MEMBER, Role.ACCOUNTANT, Role.HR
        }) {
            User caller = saveUser(role.name().toLowerCase() + "@roles.qawi.test", role, gymA);
            accessGuard.assertSameGym(caller, gymA);
            assertThrows(AppException.class, () -> accessGuard.assertSameGym(caller, gymB));
        }
    }

    @Test
    void gymAdminCanAccessOnlyMembersInOwnGym() {
        assertEquals(memberA.getId(),
                accessGuard.assertCanAccessMember(adminA.getEmail(), memberA.getId()).getId());

        AppException error = assertThrows(AppException.class,
                () -> accessGuard.assertCanAccessMember(adminA.getEmail(), memberB.getId()));
        assertEquals(HttpStatus.NOT_FOUND, error.getStatus());
    }

    @Test
    void coachRequiresBothAssignmentAndMatchingGym() {
        coachMemberRepository.save(CoachMember.builder()
                .coachId(coachA.getId())
                .memberId(memberA.getId())
                .build());

        assertEquals(memberA.getId(),
                accessGuard.assertCoachManagesMember(coachA, memberA.getId()).getId());

        coachMemberRepository.save(CoachMember.builder()
                .coachId(coachA.getId())
                .memberId(memberB.getId())
                .build());
        AppException error = assertThrows(AppException.class,
                () -> accessGuard.assertCoachManagesMember(coachA, memberB.getId()));
        assertEquals(HttpStatus.NOT_FOUND, error.getStatus());
    }

    @Test
    void ordinaryTenantRoleDoesNotGainMemberDomainPermission() {
        User receptionist = saveUser("reception@qawi.test", Role.RECEPTIONIST, gymA);

        AppException error = assertThrows(AppException.class,
                () -> accessGuard.assertCanAccessMember(receptionist.getEmail(), memberA.getId()));
        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
    }

    @Test
    void superAdminMayCrossTenantBoundaryOnlyThroughExplicitGuardPath() {
        User superAdmin = saveUser("super@qawi.test", Role.SUPER_ADMIN, null);

        assertEquals(memberB.getId(),
                accessGuard.loadUserInCallerGym(superAdmin.getEmail(), memberB.getId()).getId());
        accessGuard.assertSameGym(superAdmin, gymB);
    }

    @Test
    void gymAdminCannotMutateOrDeleteAnotherGymsEmployee() {
        User employeeB = saveUser("coach-b@qawi.test", Role.COACH, gymB);

        AppException toggleError = assertThrows(AppException.class,
                () -> employeeService.toggleStatus(employeeB.getId(), adminA.getEmail()));
        assertEquals(HttpStatus.NOT_FOUND, toggleError.getStatus());
        assertTrue(userRepository.findById(employeeB.getId()).orElseThrow().isActive());

        AppException deleteError = assertThrows(AppException.class,
                () -> employeeService.deleteEmployee(employeeB.getId(), adminA.getEmail()));
        assertEquals(HttpStatus.NOT_FOUND, deleteError.getStatus());
        assertTrue(userRepository.existsById(employeeB.getId()));
    }

    @TestConfiguration
    static class TestConfig {
        @Bean
        PasswordEncoder passwordEncoder() {
            return new PasswordEncoder() {
                @Override
                public String encode(CharSequence rawPassword) {
                    return rawPassword.toString();
                }

                @Override
                public boolean matches(CharSequence rawPassword, String encodedPassword) {
                    return rawPassword.toString().equals(encodedPassword);
                }
            };
        }
    }

    private User saveUser(String email, Role role, UUID gymId) {
        return userRepository.saveAndFlush(User.builder()
                .name(email)
                .email(email)
                .password("test-password-hash")
                .role(role)
                .gymId(gymId)
                .isActive(true)
                .build());
    }
}
