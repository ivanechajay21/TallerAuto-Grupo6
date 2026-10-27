package com.sigtm.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Petición de restablecimiento de contraseña.
 *
 * <p>Transporta el token de recuperación recibido por correo y la nueva
 * contraseña deseada. La contraseña se valida como obligatoria y con una
 * longitud mínima.</p>
 */
public record ResetPasswordRequest(
        @NotBlank(message = "El token es obligatorio")
        String token,

        @NotBlank(message = "La nueva contraseña es obligatoria")
        @Size(min = 12, message = "La contraseña debe tener al menos 12 caracteres")
        String newPassword
) {
}
