package com.sigtm.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

/**
 * Respuesta de una autenticación correcta.
 *
 * <p>El JWT viaja únicamente en la cookie HttpOnly; este cuerpo contiene los
 * datos de perfil que el frontend necesita para construir la sesión.</p>
 */
@Getter
@Setter
@AllArgsConstructor
public class JwtResponse {
    private Long id;
    private String username;
    private String email;
    private List<String> roles;
    private String name;
    private String lastName;
    private String roleName;
    private String avatarUrl;
    private String lastLogin;
    private final String type = "Bearer";
}
