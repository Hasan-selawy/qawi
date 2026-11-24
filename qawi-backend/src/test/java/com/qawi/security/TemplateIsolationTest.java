package com.qawi.security;

import com.qawi.config.SecurityConfig;
import com.qawi.controller.WorkoutTemplateController;
import com.qawi.entity.Role;
import com.qawi.entity.User;
import com.qawi.entity.WorkoutTemplate;
import com.qawi.repository.*;
import com.qawi.service.WorkoutTemplateService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;
import java.util.UUID;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(WorkoutTemplateController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, WorkoutTemplateService.class})
class TemplateIsolationTest {
    @Autowired MockMvc mvc;
    @MockBean WorkoutTemplateRepository templates;
    @MockBean WorkoutTemplateDayRepository days;
    @MockBean WorkoutTemplateDayExerciseRepository exercises;
    @MockBean UserRepository users;
    @MockBean JwtService jwt;
    @MockBean UserDetailsService details;

    @Test
    void onlyOwningCoachCanReadTemplate() throws Exception {
        User owner = coach(UUID.randomUUID());
        User sameGym = coach(owner.getGymId());
        User otherGym = coach(UUID.randomUUID());
        WorkoutTemplate template = WorkoutTemplate.builder().id(UUID.randomUUID())
                .coachId(owner.getId()).name("Private plan").build();
        when(templates.findByIdAndCoachId(template.getId(), owner.getId())).thenReturn(Optional.of(template));
        for (User caller : new User[]{owner, sameGym, otherGym}) {
            when(users.findByEmail(caller.getEmail())).thenReturn(Optional.of(caller));
            when(jwt.extractUsername(caller.getEmail())).thenReturn(caller.getEmail());
            when(details.loadUserByUsername(caller.getEmail())).thenReturn(caller);
            when(jwt.isTokenValid(caller.getEmail(), caller)).thenReturn(true);
            mvc.perform(get("/api/v1/templates/" + template.getId())
                    .header("Authorization", "Bearer " + caller.getEmail()))
                    .andExpect(status().is(caller == owner ? 200 : 404));
        }
    }

    private User coach(UUID gymId) {
        return User.builder().id(UUID.randomUUID()).gymId(gymId).role(Role.COACH)
                .name("Coach").email(UUID.randomUUID() + "@test.com").password("unused").build();
    }
}
