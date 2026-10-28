package com.sigtm.backend.security;

import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;
import com.sigtm.backend.exception.TooManyRequestsException;
import org.springframework.stereotype.Service;

import java.time.Duration;
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
    private final Cache<String, Integer> attempts = CacheBuilder.newBuilder()
            .expireAfterWrite(WINDOW)
            .build();

    public void checkLoginAllowed(String username) {
        check(normalize("login", username), MAX_LOGIN_FAILURES);
    }

    public void recordLoginFailure(String username) {
        record(normalize("login", username));
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
        Integer attemptCount = attempts.getIfPresent(key);
        if (attemptCount != null && attemptCount >= limit) {
            throw new TooManyRequestsException("Demasiados intentos. Inténtalo de nuevo en unos minutos.");
        }
    }

    private void record(String key) {
        attempts.asMap().compute(key, (ignored, existing) -> existing == null ? 1 : existing + 1);
    }

    private String normalize(String type, String value) {
        return type + ':' + (value == null ? "" : value.trim().toLowerCase(Locale.ROOT));
    }
}
