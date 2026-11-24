package com.qawi.security;

import com.qawi.config.SecurityConfig;
import com.qawi.controller.AuthController;
import com.qawi.controller.WorkoutTemplateController;
import com.qawi.controller.ZkTecoController;
import com.qawi.controller.PrivacyController;
import com.qawi.entity.Role;
import com.qawi.entity.User;
import com.qawi.service.AuthService;
import com.qawi.service.WorkoutTemplateService;
import com.qawi.service.ZkTecoService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest({AuthController.class, WorkoutTemplateController.class, ZkTecoController.class, PrivacyController.class})
@Import({SecurityConfig.class, JwtAuthFilter.class})
class Phase0SecurityTest {
    @Autowired MockMvc mvc;
    @MockBean AuthService authService;
    @MockBean com.qawi.service.PrivacyService privacy;
    @MockBean WorkoutTemplateService templates;
    @MockBean ZkTecoService devices;
    @MockBean JwtService jwtService;
    @MockBean UserDetailsService users;

    @Test
    void protectedAuthEndpointsRequireAuthentication() throws Exception {
        mvc.perform(get("/api/v1/auth/me")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/change-password").contentType("application/json")
                .content("{\"currentPassword\":\"old-password\",\"newPassword\":\"new-password\"}"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(authService);
    }

    @Test
    void invalidBearerCannotReachProtectedAuthEndpoint() throws Exception {
        when(jwtService.extractUsername("bad-token")).thenThrow(new IllegalArgumentException());
        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer bad-token"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(authService);
    }

    @Test
    void publicAuthOperationsRemainReachable() throws Exception {
        mvc.perform(post("/api/v1/auth/register").contentType("application/json").content("{}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/auth/login").contentType("application/json")
                .content("{\"email\":\"a@test.com\",\"password\":\"password\"}"))
                .andExpect(status().isOk());
        mvc.perform(post("/api/v1/auth/refresh").contentType("application/json")
                .content("{\"refreshToken\":\"token\"}"))
                .andExpect(status().isOk());
        mvc.perform(post("/api/v1/auth/logout").contentType("application/json")
                .content("{\"refreshToken\":\"token\"}"))
                .andExpect(status().isNoContent());
    }

    @Test
    void authenticatedUserCanReadOwnProfile() throws Exception {
        authenticate(Role.COACH);
        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer valid"))
                .andExpect(status().isOk());
        verify(authService).me("user@test.com");
    }

    @Test
    void memberCannotReadCoachTemplate() throws Exception {
        authenticate(Role.MEMBER);
        mvc.perform(get("/api/v1/templates/" + UUID.randomUUID())
                .header("Authorization", "Bearer valid"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(templates);
    }

    @Test
    void physicalIngestionIsDisabledEvenForAuthenticatedAdmins() throws Exception {
        authenticate(Role.GYM_ADMIN);
        for (String path : new String[]{"/api/v1/zkteco/adms", "/iclock/cdata",
                "/iclock/getrequest", "/iclock/devicecmd"}) {
            mvc.perform(get(path)).andExpect(status().is4xxClientError());
            mvc.perform(post(path).header("Authorization", "Bearer valid")
                    .param("SN", "forged-device").param("PIN", "1"))
                    .andExpect(status().isForbidden());
        }
        verifyNoInteractions(devices);
    }

    private void authenticate(Role role) {
        User user = User.builder().id(UUID.randomUUID()).name("Test").email("user@test.com")
                .password("unused").role(role).gymId(UUID.randomUUID()).build();
        when(jwtService.extractUsername("valid")).thenReturn(user.getEmail());
        when(users.loadUserByUsername(user.getEmail())).thenReturn(user);
        when(jwtService.isTokenValid("valid", user)).thenReturn(true);
    }

    @Test
    void privacyExportRequiresMemberAndDisablesCaching() throws Exception {
        mvc.perform(get("/api/v1/privacy/me")).andExpect(status().isUnauthorized());
        authenticate(Role.COACH);
        mvc.perform(get("/api/v1/privacy/me").header("Authorization", "Bearer valid"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(privacy);
        authenticate(Role.MEMBER);
        mvc.perform(get("/api/v1/privacy/me").header("Authorization", "Bearer valid"))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"));
        verify(privacy).exportSelf("user@test.com");
    }
}
