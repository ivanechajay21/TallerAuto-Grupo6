package com.sigtm.backend.security;

import com.sigtm.backend.exception.TooManyRequestsException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class LoginAttemptServiceTest {

    @Test
    void bloqueaElSextoIntentoFallidoDeInicioDeSesion() {
        LoginAttemptService service = new LoginAttemptService();

        for (int i = 0; i < 5; i++) {
            assertDoesNotThrow(() -> service.checkLoginAllowed("usuario"));
            service.recordLoginFailure("usuario");
        }

        assertThrows(TooManyRequestsException.class, () -> service.checkLoginAllowed("usuario"));
    }

    @Test
    void unInicioDeSesionCorrectoLimpiaLosIntentosFallidos() {
        LoginAttemptService service = new LoginAttemptService();
        service.recordLoginFailure("usuario");
        service.recordLoginSuccess("usuario");

        assertDoesNotThrow(() -> service.checkLoginAllowed("usuario"));
    }
}
