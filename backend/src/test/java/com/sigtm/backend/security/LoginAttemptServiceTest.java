package com.sigtm.backend.security;

import com.sigtm.backend.exception.TooManyRequestsException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LoginAttemptServiceTest {

    @Test
    void bloqueaElSextoIntentoFallidoDeInicioDeSesion() {
        LoginAttemptService service = new LoginAttemptService();

        for (int i = 0; i < 5; i++) {
            assertDoesNotThrow(() -> service.checkLoginAllowed("usuario"));
            service.recordLoginFailure("usuario");
        }

        TooManyRequestsException error = assertThrows(TooManyRequestsException.class,
                () -> service.checkLoginAllowed("usuario"));
        assertTrue(error.getMessage().contains("minuto"));
    }

    @Test
    void informaCuantosIntentosQuedanAntesDelBloqueo() {
        LoginAttemptService service = new LoginAttemptService();

        assertEquals(4, service.recordLoginFailure("usuario"));
        assertEquals(3, service.recordLoginFailure("usuario"));
        assertEquals(2, service.recordLoginFailure("usuario"));
        assertEquals(1, service.recordLoginFailure("usuario"));
        assertEquals(0, service.recordLoginFailure("usuario"));
    }

    @Test
    void unInicioDeSesionCorrectoLimpiaLosIntentosFallidos() {
        LoginAttemptService service = new LoginAttemptService();
        service.recordLoginFailure("usuario");
        service.recordLoginSuccess("usuario");

        assertDoesNotThrow(() -> service.checkLoginAllowed("usuario"));
    }
}
