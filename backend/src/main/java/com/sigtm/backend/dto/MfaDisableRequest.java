package com.sigtm.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Petición para desactivar MFA; exige contraseña y código vigente. */
public record MfaDisableRequest(
        @NotBlank(message = "La contraseña es obligatoria")
        @Size(max = 72, message = "La contraseña no es válida")
        String password,

        @NotBlank(message = "El código es obligatorio")
        @Size(max = 32, message = "El código no es válido")
        String code
) {
}
