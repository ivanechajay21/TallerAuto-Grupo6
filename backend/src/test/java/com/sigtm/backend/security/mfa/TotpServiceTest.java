package com.sigtm.backend.security.mfa;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Pruebas del generador y verificador TOTP. */
class TotpServiceTest {

    private final TotpService totp = new TotpService();

    @Test
    @DisplayName("genera un secreto Base32 reutilizable")
    void generaSecreto() {
        String secret = totp.generarSecreto();
        assertNotNull(secret);
        assertTrue(secret.matches("[A-Z2-7]+"));
        assertTrue(totp.generarCodigo(secret, Instant.now()).matches("\\d{6}"));
    }

    @Test
    @DisplayName("acepta el código actual y rechaza uno incorrecto")
    void verificaCodigo() {
        String secret = totp.generarSecreto();
        String code = totp.generarCodigo(secret, Instant.now());
        assertTrue(totp.verificar(secret, code));
        assertFalse(totp.verificar(secret, "000000"));
    }

    @Test
    @DisplayName("construye la URI y el QR para Google Authenticator")
    void construyeUriYQr() {
        String secret = totp.generarSecreto();
        String uri = totp.construirUri("SIGTM", "admin", secret);
        assertTrue(uri.startsWith("otpauth://totp/"));
        assertTrue(uri.contains("secret=" + secret));
        assertTrue(uri.contains("issuer=SIGTM"));
        assertTrue(totp.generarQrDataUri(uri).startsWith("data:image/png;base64,"));
    }
}
