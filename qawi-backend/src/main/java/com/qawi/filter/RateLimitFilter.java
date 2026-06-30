package com.qawi.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final ObjectMapper mapper = new ObjectMapper();

    private Bucket newBucket(int tokens, Duration duration) {
        Bandwidth limit = Bandwidth.classic(tokens, Refill.greedy(tokens, duration));
        return Bucket.builder().addLimit(limit).build();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {

        String path = req.getRequestURI();
        String method = req.getMethod();
        String ip = getClientIp(req);
        String key;
        Bucket bucket;

        if ("POST".equals(method) && path.contains("/auth/login")) {
            key = "login:" + ip;
            bucket = buckets.computeIfAbsent(key, k -> newBucket(5, Duration.ofMinutes(1)));
        } else if ("POST".equals(method) && path.contains("/public/register-gym")) {
            key = "register:" + ip;
            bucket = buckets.computeIfAbsent(key, k -> newBucket(3, Duration.ofHours(1)));
        } else if ("POST".equals(method) && path.contains("/admin/notifications/")
                && (path.endsWith("/send") || path.endsWith("/schedule"))) {
            // Admin broadcasts fan out to many recipients — throttle harder, per sender.
            String authHeader = req.getHeader("Authorization");
            String identity = authHeader != null && authHeader.startsWith("Bearer ")
                    ? "user:" + Math.abs(authHeader.hashCode())
                    : "ip:" + ip;
            key = "admin-notif:" + identity;
            bucket = buckets.computeIfAbsent(key, k -> newBucket(10, Duration.ofMinutes(1)));
        } else {
            String authHeader = req.getHeader("Authorization");
            String identity = authHeader != null && authHeader.startsWith("Bearer ")
                    ? "user:" + Math.abs(authHeader.hashCode())
                    : "ip:" + ip;
            key = "general:" + identity;
            bucket = buckets.computeIfAbsent(key, k -> newBucket(100, Duration.ofMinutes(1)));
        }

        if (bucket.tryConsume(1)) {
            chain.doFilter(req, res);
        } else {
            log.warn("Rate limit exceeded for key={}", key);
            res.setStatus(429);
            res.setContentType("application/json;charset=UTF-8");
            res.getWriter().write(mapper.writeValueAsString(Map.of(
                    "error", "Too many requests. Please slow down.",
                    "messageAr", "طلبات كثيرة جداً. يرجى الانتظار.",
                    "timestamp", java.time.LocalDateTime.now().toString()
            )));
        }
    }

    private String getClientIp(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return req.getRemoteAddr();
    }
}
