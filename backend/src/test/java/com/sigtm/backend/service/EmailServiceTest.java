package com.sigtm.backend.service;

import com.sigtm.backend.repository.ConfiguracionRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Pruebas de la plantilla corporativa del correo de recuperación. */
@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

    @Mock private ConfiguracionRepository configuracionRepository;

    @Test
    @DisplayName("la plantilla reemplaza nombre y enlace sin dejar marcadores")
    void plantillaReemplazaDatos() {
        EmailService service = new EmailService(configuracionRepository);
        ReflectionTestUtils.setField(service, "baseUrl", "http://localhost:3000");

        String html = service.buildResetPasswordEmail("Ivan Echajay", "abc123");

        assertTrue(html.contains("Ivan Echajay"));
        assertTrue(html.contains("http://localhost:3000/restablecer-contrasena?token=abc123"));
        assertTrue(html.contains("SIGTM"));
        assertTrue(html.contains("Restablecer contraseña"));
        assertFalse(html.contains("%s"));
        assertFalse(html.contains("{{NAME}}"));
        assertFalse(html.contains("{{LINK}}"));
    }

    @Test
    @DisplayName("el nombre se escapa antes de insertarse en el HTML")
    void plantillaEscapaNombre() {
        EmailService service = new EmailService(configuracionRepository);
        ReflectionTestUtils.setField(service, "baseUrl", "http://localhost:3000");

        String html = service.buildResetPasswordEmail("<Ivan & Ana>", "token");

        assertTrue(html.contains("&lt;Ivan &amp; Ana&gt;"));
        assertFalse(html.contains("<Ivan & Ana>"));
    }
}
