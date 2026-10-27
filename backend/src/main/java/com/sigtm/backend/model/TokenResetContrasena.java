package com.sigtm.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Token de un solo uso para restablecer la contraseña de un usuario.
 *
 * <p>Se persiste en la tabla tokens_reseteo_contrasena, asociado al Usuario que solicitó el
 * cambio. El token únicamente es válido mientras no se haya utilizado y su fecha de expiración
 * siga vigente.</p>
 */
@Entity
@Table(name = "tokens_reseteo_contrasena")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TokenResetContrasena {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "token", nullable = false, unique = true, length = 64)
    private String token;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    @JsonIgnore
    private Usuario user;

    @Column(name = "fecha_expiracion", nullable = false)
    private LocalDateTime expiryDate;

    @Column(name = "usado", nullable = false)
    private boolean used = false;

    public boolean isValid() {
        return !used && expiryDate.isAfter(LocalDateTime.now());
    }
}
