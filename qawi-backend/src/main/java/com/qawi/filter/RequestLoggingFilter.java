package com.qawi.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Slf4j
@Component
@Order(1)
public class RequestLoggingFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {

        String requestId = UUID.randomUUID().toString().substring(0, 8);
        long start = System.currentTimeMillis();

        MDC.put("requestId", requestId);
        MDC.put("method", req.getMethod());
        MDC.put("path", req.getRequestURI());

        try {
            chain.doFilter(req, res);
        } finally {
            long duration = System.currentTimeMillis() - start;
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String userId = (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName()))
                    ? auth.getName()
                    : "anonymous";

            log.info("[{} {}] userId={} duration={}ms status={}",
                    req.getMethod(), req.getRequestURI(), userId, duration, res.getStatus());

            MDC.clear();
        }
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.startsWith("/actuator");
    }
}
