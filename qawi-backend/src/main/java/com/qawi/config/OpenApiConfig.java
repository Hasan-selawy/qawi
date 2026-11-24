package com.qawi.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.util.List;

@Configuration
public class OpenApiConfig {
    @Bean
    OpenAPI qawiApi() {
        return new OpenAPI().info(new Info().title("Qawi API").version("1.0.0"))
                .components(new Components().addSecuritySchemes("bearerAuth",
                        new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")));
    }

    @Bean
    OpenApiCustomizer stableOperations() {
        return api -> api.getPaths().forEach((path, item) -> item.readOperationsMap().forEach((method, operation) -> {
            StringBuilder id = new StringBuilder(method.name().toLowerCase(java.util.Locale.ROOT));
            for (String part : path.split("[^a-zA-Z0-9]+")) {
                if (!part.isEmpty()) id.append(Character.toUpperCase(part.charAt(0))).append(part.substring(1));
            }
            operation.setOperationId(id.toString());
            boolean publicRoute = path.startsWith("/api/v1/public/")
                    || (method.name().equals("POST") && List.of("login", "register", "refresh", "logout")
                        .stream().anyMatch(name -> path.equals("/api/v1/auth/" + name)));
            operation.setSecurity(publicRoute ? List.of() : List.of(new SecurityRequirement().addList("bearerAuth")));
        }));
    }
}
