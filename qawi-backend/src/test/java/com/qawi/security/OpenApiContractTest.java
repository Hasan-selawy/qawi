package com.qawi.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qawi.entity.Role;
import com.qawi.entity.User;
import com.qawi.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import java.nio.file.Files;
import java.nio.file.Path;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:contract;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa",
        "spring.datasource.password=", "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop", "spring.flyway.enabled=false",
        "app.jwt.secret=contract-test-only-signing-key-with-32-bytes-minimum",
        "qawi.notifications.jobs.enabled=false", "qawi.seed.enabled=false", "qawi.observability.sentry-dsn="
})
@AutoConfigureMockMvc
class OpenApiContractTest {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired JwtService jwt;
    @Autowired ObjectMapper mapper;
    @Autowired com.qawi.service.NutritionV3Service nutrition;

    @Test
    void legacyAdapterCannotBypassCanonicalInputValidation() {
        var request = new com.qawi.dto.FoodEntryRequest();
        request.setMemberId(java.util.UUID.randomUUID());
        request.setRawInput("Food");
        request.setCalories(-1.0);
        assertThrows(jakarta.validation.ConstraintViolationException.class,
                () -> nutrition.logFood("not-an-account@test.com", request));
    }

    @Test
    void springContractDocumentsRealRoutesAndBearerSecurity() throws Exception {
        User admin = users.save(User.builder().email("contract-admin@test.com").name("Contract")
                .password("unused").role(Role.SUPER_ADMIN).build());
        String body = mvc.perform(get("/v3/api-docs").header("Authorization", "Bearer " + jwt.generateToken(admin)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        JsonNode contract = mapper.readTree(body);
        assertTrue(contract.path("paths").size() > 100);
        assertEquals("http", contract.at("/components/securitySchemes/bearerAuth/type").asText());
        assertEquals("postApiV1AuthLogin", contract.path("paths").path("/api/v1/auth/login")
                .path("post").path("operationId").asText());
        assertTrue(contract.path("paths").path("/api/v1/auth/login").path("post").path("security").isEmpty());
        assertFalse(contract.path("paths").path("/api/v1/auth/me").path("get").path("security").isEmpty());
        Files.writeString(Path.of("target/openapi.json"), mapper.writerWithDefaultPrettyPrinter().writeValueAsString(contract));
        mvc.perform(get("/actuator/metrics").header("Authorization", "Bearer " + jwt.generateToken(admin)))
                .andExpect(status().isOk());
        mvc.perform(get("/actuator/metrics")).andExpect(status().isUnauthorized());
        User member = users.save(User.builder().email("contract-member@test.com").name("Contract")
                .password("unused").role(Role.MEMBER).build());
        mvc.perform(get("/v3/api-docs").header("Authorization", "Bearer " + jwt.generateToken(member)))
                .andExpect(status().isForbidden());
        mvc.perform(get("/actuator/metrics").header("Authorization", "Bearer " + jwt.generateToken(member)))
                .andExpect(status().isForbidden())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content()
                        .contentTypeCompatibleWith("application/json"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.error").value("Access denied"));
    }
}
