package com.sigtm.backend.service;

import com.sigtm.backend.dto.ActualizarUsuarioRequest;
import com.sigtm.backend.dto.CrearUsuarioRequest;
import com.sigtm.backend.model.Rol;
import com.sigtm.backend.model.Usuario;
import com.sigtm.backend.repository.RolRepository;
import com.sigtm.backend.repository.UsuarioRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Pruebas de las reglas de privilegios de {@link UsuarioService}.
 *
 * <p>Un usuario con permiso para editar cuentas no debe poder convertirse en
 * administrador, crear administradores ni modificar o desactivar a otro
 * administrador. Estas pruebas evitan una escalada de privilegios por la API.</p>
 */
@ExtendWith(MockitoExtension.class)
class UsuarioServiceTest {

    @Mock private UsuarioRepository usuarioRepository;
    @Mock private RolRepository rolRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private AuditoriaService auditoriaService;

    @InjectMocks private UsuarioService usuarioService;

    private Rol rol(Long id, String name) {
        return Rol.builder().id(id).name(name).build();
    }

    private Usuario usuario(Long id, String username, Rol rol) {
        return Usuario.builder()
                .id(id)
                .name("Usuario")
                .lastName("Prueba")
                .username(username)
                .email(username + "@sigtm.test")
                .password("$2a$10$hash")
                .role(rol)
                .active(true)
                .tokenVersion(0)
                .build();
    }

    @Test
    @DisplayName("un no administrador no puede asignarse ROLE_ADMIN al actualizarse")
    void actualizar_noAdmin_noPuedeAsignarAdmin() {
        Rol manager = rol(2L, "ROLE_MANAGER");
        Rol admin = rol(1L, "ROLE_ADMIN");
        Usuario objetivo = usuario(5L, "manager", manager);
        Usuario actual = usuario(9L, "otro-manager", manager);

        when(usuarioRepository.findById(5L)).thenReturn(Optional.of(objetivo));
        when(usuarioRepository.findById(9L)).thenReturn(Optional.of(actual));
        when(rolRepository.findByName("ROLE_ADMIN")).thenReturn(Optional.of(admin));

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> usuarioService.actualizarUsuario(5L,
                        new ActualizarUsuarioRequest(null, null, null, null, "ROLE_ADMIN", null),
                        9L));

        assertTrue(error.getMessage().contains("Solo un administrador"));
        verify(usuarioRepository, never()).save(any(Usuario.class));
    }

    @Test
    @DisplayName("un administrador sí puede asignar ROLE_ADMIN")
    void actualizar_admin_puedeAsignarAdmin() {
        Rol manager = rol(2L, "ROLE_MANAGER");
        Rol admin = rol(1L, "ROLE_ADMIN");
        Usuario objetivo = usuario(5L, "manager", manager);
        Usuario actual = usuario(9L, "admin", admin);

        when(usuarioRepository.findById(5L)).thenReturn(Optional.of(objetivo));
        when(usuarioRepository.findById(9L)).thenReturn(Optional.of(actual));
        when(rolRepository.findByName("ROLE_ADMIN")).thenReturn(Optional.of(admin));
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(invocation -> invocation.getArgument(0));

        usuarioService.actualizarUsuario(5L,
                new ActualizarUsuarioRequest(null, null, null, null, "ROLE_ADMIN", null),
                9L);

        assertEquals("ROLE_ADMIN", objetivo.getRole().getName());
        verify(usuarioRepository).save(objetivo);
    }

    @Test
    @DisplayName("un no administrador no puede modificar a un administrador")
    void actualizar_noAdmin_noPuedeModificarAdmin() {
        Rol admin = rol(1L, "ROLE_ADMIN");
        Rol manager = rol(2L, "ROLE_MANAGER");
        Usuario objetivo = usuario(5L, "admin", admin);
        Usuario actual = usuario(9L, "manager", manager);

        when(usuarioRepository.findById(5L)).thenReturn(Optional.of(objetivo));
        when(usuarioRepository.findById(9L)).thenReturn(Optional.of(actual));

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> usuarioService.actualizarUsuario(5L,
                        new ActualizarUsuarioRequest("Nuevo nombre", null, null, null, null, null),
                        9L));

        assertTrue(error.getMessage().contains("modificar a otro administrador"));
        verify(usuarioRepository, never()).save(any(Usuario.class));
    }

    @Test
    @DisplayName("un no administrador no puede crear un administrador")
    void crear_noAdmin_noPuedeCrearAdmin() {
        Rol admin = rol(1L, "ROLE_ADMIN");
        Rol manager = rol(2L, "ROLE_MANAGER");
        Usuario actual = usuario(9L, "manager", manager);

        when(rolRepository.findByName("ROLE_ADMIN")).thenReturn(Optional.of(admin));
        when(usuarioRepository.findById(9L)).thenReturn(Optional.of(actual));

        CrearUsuarioRequest solicitud = new CrearUsuarioRequest(
                "Nuevo", "Admin", "nuevo-admin", "nuevo-admin@sigtm.test",
                null, "ROLE_ADMIN", "password-seguro-123");

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> usuarioService.crearUsuario(solicitud, 9L));

        assertTrue(error.getMessage().contains("crear usuarios con rol Administrador"));
        verify(usuarioRepository, never()).save(any(Usuario.class));
    }

    @Test
    @DisplayName("un no administrador no puede desactivar a un administrador")
    void setActive_noAdmin_noPuedeDesactivarAdmin() {
        Rol admin = rol(1L, "ROLE_ADMIN");
        Rol manager = rol(2L, "ROLE_MANAGER");
        Usuario objetivo = usuario(5L, "admin", admin);
        Usuario actual = usuario(9L, "manager", manager);

        when(usuarioRepository.findById(5L)).thenReturn(Optional.of(objetivo));
        when(usuarioRepository.findById(9L)).thenReturn(Optional.of(actual));

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> usuarioService.setActive(5L, false, 9L));

        assertTrue(error.getMessage().contains("estado de otro administrador"));
        verify(usuarioRepository, never()).save(any(Usuario.class));
    }

    @Test
    @DisplayName("nadie puede desactivar su propia cuenta")
    void setActive_noPuedeDesactivarseASiMismo() {
        Usuario admin = usuario(9L, "admin", rol(1L, "ROLE_ADMIN"));
        when(usuarioRepository.findById(9L)).thenReturn(Optional.of(admin));

        assertThrows(IllegalArgumentException.class, () -> usuarioService.setActive(9L, false, 9L));
        verify(usuarioRepository, never()).save(any(Usuario.class));
    }
}
