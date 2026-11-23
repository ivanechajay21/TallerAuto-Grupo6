package com.sigtm.backend.security;

import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;
import com.sigtm.backend.exception.TooManyRequestsException;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;

/**
 * Limita intentos de autenticación y recuperación por identidad. Para una instalación
 * distribuida debe sustituirse por Redis u otra caché compartida.
 */
@Service
public class LoginAttemptService {
    private static final int MAX_LOGIN_FAILURES = 5;
    private static final int MAX_RESET_REQUESTS = 3;
    private static final Duration WINDOW = Duration.ofMinutes(15);
    private final Cache<String, Attempt> attempts = CacheBuilder.newBuilder()
            .expireAfterWrite(WINDOW)
            .build();

    private record Attempt(int count, Instant firstAttempt) {
    }

    public void checkLoginAllowed(String username) {
        check(normalize("login", username), MAX_LOGIN_FAILURES);
    }

    public int recordLoginFailure(String username) {
        int count = record(normalize("login", username));
        return Math.max(0, MAX_LOGIN_FAILURES - count);
    }

    public void recordLoginSuccess(String username) {
        attempts.invalidate(normalize("login", username));
    }

    public void recordResetRequest(String email) {
        String key = normalize("reset", email);
        check(key, MAX_RESET_REQUESTS);
        record(key);
    }

    private void check(String key, int limit) {
        Attempt attempt = attempts.getIfPresent(key);
        if (attempt == null || attempt.count() < limit) {
            return;
        }

        long seconds = Math.max(1, Duration.between(Instant.now(),
                attempt.firstAttempt().plus(WINDOW)).toSeconds());
        long minutes = Math.max(1, (seconds + 59) / 60);
        String unidad = minutes == 1 ? "minuto" : "minutos";
        throw new TooManyRequestsException(
                "Demasiados intentos. Espera " + minutes + " " + unidad
                        + " antes de volver a intentar.");
    }

    private int record(String key) {
        Attempt updated = attempts.asMap().compute(key, (ignored, existing) -> existing == null
                ? new Attempt(1, Instant.now())
                : new Attempt(existing.count() + 1, existing.firstAttempt()));
        return updated == null ? 0 : updated.count();
    }

    private String normalize(String type, String value) {
        return type + ':' + (value == null ? "" : value.trim().toLowerCase(Locale.ROOT));
    }
}
