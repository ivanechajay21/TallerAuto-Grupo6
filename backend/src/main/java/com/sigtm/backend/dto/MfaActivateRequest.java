package com.sigtm.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Petición para activar MFA después de comprobar el primer código. */
public record MfaActivateRequest(
        @NotBlank(message = "El token de configuración es obligatorio")
        String setupToken,

        @NotBlank(message = "El código es obligatorio")
        @Size(max = 32, message = "El código no es válido")
        String code,

        Boolean remember
) {
}
