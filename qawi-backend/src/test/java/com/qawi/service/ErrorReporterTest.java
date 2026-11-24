package com.qawi.service;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ErrorReporterTest {
    @Test
    void reportedFailureContainsNoBodyCredentialsOrCause() {
        var original = new IllegalArgumentException("member@example.com Bearer secret weight=75",
                new RuntimeException("jdbc-password"));
        original.setStackTrace(new StackTraceElement[]{
                new StackTraceElement("com.qawi.service.Example", "save", "Example.java", 42),
                new StackTraceElement("org.postgresql.Driver", "read", "Driver.java", 2)});
        var sanitized = ErrorReporter.sanitized(original);
        assertFalse(sanitized.getMessage().contains("member@example.com"));
        assertFalse(sanitized.getMessage().contains("secret"));
        assertNull(sanitized.getCause());
        assertEquals(1, sanitized.getStackTrace().length);
        assertEquals(42, sanitized.getStackTrace()[0].getLineNumber());
    }
}
