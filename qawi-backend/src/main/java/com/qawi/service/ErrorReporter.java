package com.qawi.service;

import io.micrometer.core.instrument.MeterRegistry;
import io.sentry.Sentry;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.util.Arrays;

/** Only exception type and application code locations leave the process; no request or domain data. */
@Component
public class ErrorReporter {
    private final MeterRegistry metrics;
    @Value("${qawi.observability.sentry-dsn:}") private String dsn;
    @Value("${qawi.observability.environment:production}") private String environment;

    public ErrorReporter(MeterRegistry metrics) { this.metrics = metrics; }

    @PostConstruct
    void initialize() {
        if (dsn.isBlank()) return;
        Sentry.init(options -> {
            options.setDsn(dsn);
            options.setEnvironment(environment);
            options.setSendDefaultPii(false);
            options.setEnableUncaughtExceptionHandler(false);
            options.setEnableAutoSessionTracking(false);
            options.setBeforeSend((event, hint) -> {
                event.setRequest(null); event.setUser(null); event.setBreadcrumbs(null); event.setExtras(null);
                return event;
            });
        });
    }

    public void report(Throwable failure) {
        metrics.counter("qawi.server.errors", "type", failure.getClass().getSimpleName()).increment();
        if (!dsn.isBlank()) Sentry.captureException(sanitized(failure));
    }

    public static RuntimeException sanitized(Throwable failure) {
        RuntimeException result = new RuntimeException("Unhandled server error: " + failure.getClass().getSimpleName());
        result.setStackTrace(Arrays.stream(failure.getStackTrace())
                .filter(frame -> frame.getClassName().startsWith("com.qawi.")).toArray(StackTraceElement[]::new));
        return result;
    }

    @PreDestroy
    void close() { if (!dsn.isBlank()) Sentry.close(); }
}
