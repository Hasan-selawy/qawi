package com.qawi.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qawi.entity.MobilePushToken;
import com.qawi.entity.NotificationType;
import com.qawi.repository.MobilePushTokenRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Best-effort Expo push delivery for the mobile app.
 *
 * <p>Posts to Expo's public push service ({@code https://exp.host/--/api/v2/push/send}).
 * Never throws; transport problems are logged. Tokens that Expo reports as
 * {@code DeviceNotRegistered} are deactivated so we stop targeting dead devices.
 */
@Service
@RequiredArgsConstructor
public class ExpoPushService {

    private static final Logger log = LoggerFactory.getLogger(ExpoPushService.class);
    private static final String EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

    private final MobilePushTokenRepository mobilePushTokenRepository;
    private final ObjectMapper objectMapper;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public void sendToUser(UUID userId, String title, String titleAr,
                           String body, String bodyAr, String actionUrl, NotificationType type) {
        if (userId == null) return;

        List<MobilePushToken> tokens = mobilePushTokenRepository.findByUserIdAndActiveTrue(userId);
        if (tokens.isEmpty()) return;

        List<Map<String, Object>> messages = new ArrayList<>(tokens.size());
        for (MobilePushToken token : tokens) {
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("type", type != null ? type.name() : null);
            data.put("actionUrl", actionUrl);
            data.put("titleAr", titleAr);
            data.put("bodyAr", bodyAr);

            Map<String, Object> message = new LinkedHashMap<>();
            message.put("to", token.getExpoPushToken());
            message.put("title", title);
            message.put("body", body);
            message.put("sound", "default");
            message.put("data", data);
            messages.add(message);
        }

        try {
            String json = objectMapper.writeValueAsString(messages);
            HttpRequest request = HttpRequest.newBuilder(URI.create(EXPO_PUSH_URL))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .timeout(Duration.ofSeconds(10))
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            handleResponse(response.body(), tokens);
        } catch (Exception e) {
            log.warn("Expo push to user {} failed: {}", userId, e.getMessage());
        }
    }

    /**
     * Expo replies with {@code {"data":[{"status":"ok"|"error", "details":{"error":"..."}}]}}
     * where the ticket order mirrors the request order. Deactivate tokens whose
     * ticket reports {@code DeviceNotRegistered}.
     */
    private void handleResponse(String body, List<MobilePushToken> tokens) {
        if (body == null || body.isBlank()) return;
        try {
            JsonNode root = objectMapper.readTree(body);
            JsonNode data = root.get("data");
            if (data == null || !data.isArray()) return;
            for (int i = 0; i < data.size() && i < tokens.size(); i++) {
                JsonNode ticket = data.get(i);
                MobilePushToken token = tokens.get(i);
                String status = ticket.path("status").asText("");
                if ("error".equals(status)) {
                    String error = ticket.path("details").path("error").asText("");
                    if ("DeviceNotRegistered".equals(error)) {
                        token.setActive(false);
                        mobilePushTokenRepository.save(token);
                    }
                } else {
                    token.setLastUsedAt(LocalDateTime.now());
                    mobilePushTokenRepository.save(token);
                }
            }
        } catch (Exception e) {
            log.warn("Failed to parse Expo push response: {}", e.getMessage());
        }
    }
}
