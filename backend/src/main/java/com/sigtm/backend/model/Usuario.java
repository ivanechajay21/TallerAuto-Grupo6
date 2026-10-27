package com.sigtm.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Usuario del sistema, normalmente un miembro del personal del taller.
 *
 * <p>Se persiste en la tabla usuarios y tiene un único Rol asignado que determina sus permisos.
 * La contraseña se almacena cifrada y la cuenta puede desactivarse sin eliminarla. También es
 * referenciado por los registros de auditoría y por las notificaciones dirigidas.</p>
 */
@Entity
@Table(name = "usuarios")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Usuario extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nombres", nullable = false, length = 100)
    private String name;

    @Column(name = "apellidos", nullable = false, length = 100)
    private String lastName;

    @Column(name = "nombre_usuario", nullable = false, unique = true, length = 50)
    private String username;

    @Column(name = "correo", nullable = false, unique = true, length = 150)
    private String email;

    @Column(name = "contrasena", nullable = false)
    private String password;

    @Column(name = "telefono", length = 20)
    private String phone;

    @Column(name = "url_avatar", length = 255)
    private String avatarUrl;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "rol_id", nullable = false)
    private Rol role;

    @Column(name = "activo", nullable = false)
    private Boolean active = true;

    @Column(name = "ultimo_acceso")
    private LocalDateTime lastLogin;

    @Column(name = "version_token", nullable = false)
    private int tokenVersion = 0;
}
