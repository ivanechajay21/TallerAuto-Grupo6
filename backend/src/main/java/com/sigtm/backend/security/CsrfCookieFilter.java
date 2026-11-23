package com.sigtm.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Set;

/**
 * Protección CSRF por doble cookie para las peticiones autenticadas por cookie.
 *
 * <p>El token CSRF se guarda en la cookie legible {@code XSRF-TOKEN}. El
 * frontend debe enviarlo en la cabecera {@code X-XSRF-TOKEN} para cualquier
 * método que modifique estado. Los clientes que usan la cabecera
 * {@code Authorization} no necesitan CSRF porque el navegador no adjunta esa
 * cabecera automáticamente.</p>
 */
public class CsrfCookieFilter extends OncePerRequestFilter {

    private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS", "TRACE");
    private static final SecureRandom RANDOM = new SecureRandom();

    private final boolean secureCookie;
    private final String sameSite;

    public CsrfCookieFilter(boolean secureCookie, String sameSite) {
        this.secureCookie = secureCookie;
        this.sameSite = sameSite;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String token = leerCookie(request, CookieNames.CSRF);
        boolean creado = false;
        if (token == null || token.isBlank()) {
            token = generarToken();
            creado = true;
            response.addHeader(HttpHeaders.SET_COOKIE, ResponseCookie.from(CookieNames.CSRF, token)
                    .httpOnly(false)
                    .secure(secureCookie)
                    .sameSite(sameSite)
                    .path("/")
                    .build()
                    .toString());
        }

        if (requiereCsrf(request) && tieneSesion(request) && !tieneBearer(request)) {
            String recibido = request.getHeader(CookieNames.CSRF_HEADER);
            if (creado || recibido == null || !iguales(token, recibido)) {
                escribirError(response);
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private boolean requiereCsrf(HttpServletRequest request) {
        return !SAFE_METHODS.contains(request.getMethod().toUpperCase());
    }

    private boolean tieneSesion(HttpServletRequest request) {
        return leerCookie(request, CookieNames.SESSION) != null;
    }

    private boolean tieneBearer(HttpServletRequest request) {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        return header != null && header.startsWith("Bearer ");
    }

    private String leerCookie(HttpServletRequest request, String nombre) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if (nombre.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    private boolean iguales(String esperado, String recibido) {
        return MessageDigest.isEqual(
                esperado.getBytes(StandardCharsets.UTF_8),
                recibido.getBytes(StandardCharsets.UTF_8));
    }

    private String generarToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private void escribirError(HttpServletResponse response) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json");
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.getWriter().write(
                "{\"status\":403,\"error\":\"Forbidden\",\"message\":\"Token CSRF inválido o ausente.\"}");
    }
}
