package com.sigtm.backend.security;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Pruebas del doble cookie CSRF. */
class CsrfCookieFilterTest {

    private final CsrfCookieFilter filter = new CsrfCookieFilter(false, "Strict");

    @Test
    @DisplayName("genera la cookie CSRF en peticiones seguras")
    void generaCookieCsrf() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/autenticacion/csrf");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertNotNull(response.getHeader("Set-Cookie"));
        assertTrue(response.getHeader("Set-Cookie").contains("XSRF-TOKEN="));
        assertNotNull(chain.getRequest());
    }

    @Test
    @DisplayName("bloquea un POST autenticado por cookie sin cabecera CSRF")
    void bloqueaPostSinCsrf() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/usuarios/presencia");
        request.setCookies(new Cookie(CookieNames.SESSION, "jwt"));
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(403, response.getStatus());
    }

    @Test
    @DisplayName("permite un POST autenticado por cookie con CSRF válido")
    void permitePostConCsrf() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/usuarios/presencia");
        request.setCookies(
                new Cookie(CookieNames.SESSION, "jwt"),
                new Cookie(CookieNames.CSRF, "token-csrf"));
        request.addHeader(CookieNames.CSRF_HEADER, "token-csrf");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertEquals(200, response.getStatus());
        assertNotNull(chain.getRequest());
    }
}
