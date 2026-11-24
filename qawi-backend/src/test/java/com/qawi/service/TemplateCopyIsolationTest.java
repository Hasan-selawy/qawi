package com.qawi.service;

import com.qawi.dto.CreateFromTemplateRequest;
import com.qawi.entity.Role;
import com.qawi.entity.User;
import com.qawi.entity.WorkoutTemplate;
import com.qawi.exception.AppException;
import com.qawi.repository.WorkoutTemplateRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TemplateCopyIsolationTest {
    @Mock AccessGuard access;
    @Mock WorkoutTemplateRepository templates;
    @InjectMocks WorkoutPlanService plans;

    @Test
    void assignedCoachCannotCopyAnotherCoachsTemplate() {
        User coach = User.builder().id(UUID.randomUUID()).role(Role.COACH).email("coach@test.com").build();
        CreateFromTemplateRequest request = new CreateFromTemplateRequest();
        request.setTemplateId(UUID.randomUUID());
        request.setMemberId(UUID.randomUUID());
        when(access.loadUserByEmail(coach.getEmail())).thenReturn(coach);
        when(templates.findByIdAndCoachId(request.getTemplateId(), coach.getId())).thenReturn(Optional.empty());
        AppException error = assertThrows(AppException.class, () -> plans.createFromTemplate(request, coach.getEmail()));
        assertEquals(404, error.getStatus().value());
        verify(templates, never()).findById(any());
    }
}
