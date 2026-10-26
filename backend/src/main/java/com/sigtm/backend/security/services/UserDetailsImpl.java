package com.sigtm.backend.security.services;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.sigtm.backend.model.Usuario;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Implementación de {@link UserDetails} para los usuarios de la aplicación.
 *
 * <p>Expone los datos de autenticación y perfil que Spring Security necesita
 * durante el proceso de inicio de sesión, además de las autoridades derivadas
 * de los permisos y del rol asignados. La contraseña se marca con
 * {@code @JsonIgnore} para que nunca se exponga en las respuestas.</p>
 */
@Getter
@AllArgsConstructor
public class UserDetailsImpl implements UserDetails {
    private static final long serialVersionUID = 1L;

    private Long id;
    private String username;
    private String email;

    @JsonIgnore
    private String password;

    private String name;
    private String lastName;
    private String roleName;
    private String avatarUrl;

    private Boolean active;
    private int tokenVersion;
    private Collection<? extends GrantedAuthority> authorities;

    /**
     * Construye los detalles de seguridad a partir de una entidad de usuario.
     *
     * @param user Entidad de usuario con su rol y permisos ya cargados.
     * @return Detalles de usuario con las autoridades derivadas de los
     *         permisos y del nombre del rol.
     */
    public static UserDetailsImpl build(Usuario user) {
        List<GrantedAuthority> authorities = new java.util.ArrayList<>(user.getRole().getPermissions().stream()
                .map(permission -> new SimpleGrantedAuthority(permission.getCode()))
                .collect(Collectors.toList()));
        
        String roleName = user.getRole().getName().toUpperCase();
        if (!roleName.startsWith("ROLE_")) {
            roleName = "ROLE_" + roleName;
        }
        authorities.add(new SimpleGrantedAuthority(roleName));

        return new UserDetailsImpl(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getPassword(),
                user.getName(),
                user.getLastName(),
                roleName,
                user.getAvatarUrl(),
                user.getActive(),
                user.getTokenVersion(),
                authorities);
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o)
            return true;
        if (o == null || getClass() != o.getClass())
            return false;
        UserDetailsImpl user = (UserDetailsImpl) o;
        return Objects.equals(id, user.id);
    }
}
