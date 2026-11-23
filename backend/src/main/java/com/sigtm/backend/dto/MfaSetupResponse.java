package com.sigtm.backend.dto;

/** Datos para configurar la aplicación autenticadora. */
public record MfaSetupResponse(
        String secret,
        String otpauthUri,
        String qrImage
) {
}
