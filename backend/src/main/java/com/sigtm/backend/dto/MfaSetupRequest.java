package com.sigtm.backend.dto;

import jakarta.validation.constraints.NotBlank;

/** Petición para iniciar la configuración de MFA de un administrador. */
public record MfaSetupRequest(
        @NotBlank(message = "El token de configuración es obligatorio")
        String setupToken
) {
}
