package com.sigtm.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * Petición de inicio de sesión.
 *
 * <p>Recibe el nombre de usuario y la contraseña para autenticar al usuario.
 * Ambos campos son obligatorios y se validan antes de intentar la
 * autenticación.</p>
 */
@Getter
@Setter
public class LoginRequest {
    @NotBlank(message = "El usuario es obligatorio")
    @Size(max = 50, message = "El usuario no puede superar 50 caracteres")
    private String username;

    @NotBlank(message = "La contraseña es obligatoria")
    @Size(max = 72, message = "La contraseña no puede superar 72 caracteres")
    private String password;

    private Boolean remember = true;
}
