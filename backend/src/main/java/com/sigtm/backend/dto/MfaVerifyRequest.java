package com.sigtm.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Petición para verificar el segundo factor de un inicio de sesión. */
public record MfaVerifyRequest(
        @NotBlank(message = "El token de verificación es obligatorio")
        String challengeToken,

        @NotBlank(message = "El código es obligatorio")
        @Size(max = 32, message = "El código no es válido")
        String code,

        Boolean remember
) {
}
