package com.qawi.filter;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;

class RateLimitFilterTest {
    @Test
    void rotatingForwardedHeadersCannotResetLoginLimit() throws Exception {
        RateLimitFilter filter = new RateLimitFilter();
        for (int i = 0; i < 6; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/auth/login");
            request.setRemoteAddr("192.0.2.10");
            request.addHeader("X-Forwarded-For", "198.51.100." + i);
            request.addHeader("Forwarded", "for=198.51.100." + i);
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilter(request, response, (req, res) -> {});
            assertEquals(i < 5 ? 200 : 429, response.getStatus());
        }
        MockHttpServletRequest otherPeer = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        otherPeer.setRemoteAddr("192.0.2.11");
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(otherPeer, response, (req, res) -> {});
        assertEquals(200, response.getStatus());
    }
}
