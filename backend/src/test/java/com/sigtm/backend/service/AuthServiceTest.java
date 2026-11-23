package com.sigtm.backend.service;

import com.sigtm.backend.model.TokenResetContrasena;
import com.sigtm.backend.model.Usuario;
import com.sigtm.backend.repository.TokenResetContrasenaRepository;
import com.sigtm.backend.repository.UsuarioRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Pruebas del restablecimiento de contraseña y sus notificaciones de seguridad. */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UsuarioRepository usuarioRepository;
    @Mock private TokenResetContrasenaRepository tokenRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private EmailService emailService;
    @Mock private NotificacionService notificacionService;
    @Mock private AuditoriaService auditoriaService;

    @InjectMocks private AuthService authService;

    @Test
    @DisplayName("envía el enlace a un correo registrado cuando el SMTP está configurado")
    void forgotPasswordEnviaCorreoRegistrado() {
        Usuario usuario = Usuario.builder()
                .id(8L)
                .username("usuario")
                .name("Luis")
                .email("luis@gmail.com")
                .active(true)
                .build();
        when(usuarioRepository.findByEmailIgnoreCase("luis@gmail.com")).thenReturn(Optional.of(usuario));
        when(emailService.estaConfigurado()).thenReturn(true);
        when(emailService.sendHtmlEmail(eq("luis@gmail.com"), anyString(), anyString())).thenReturn(true);
        when(emailService.buildResetPasswordEmail(eq("Luis"), anyString())).thenReturn("<html>enlace</html>");
        when(tokenRepository.save(any(TokenResetContrasena.class))).thenAnswer(i -> i.getArgument(0));

        authService.forgotPassword("Luis@Gmail.com ");

        verify(tokenRepository).save(any(TokenResetContrasena.class));
        verify(emailService).sendHtmlEmail(eq("luis@gmail.com"), anyString(), anyString());
    }

    @Test
    @DisplayName("al restablecer la contraseña notifica al usuario y a los administradores")
    void resetPasswordNotificaAlAdministrador() {
        Usuario usuario = Usuario.builder()
                .id(7L)
                .username("recepcion")
                .name("Ana")
                .email("ana@gmail.com")
                .password("hash-anterior")
                .tokenVersion(2)
                .active(true)
                .build();
        TokenResetContrasena token = TokenResetContrasena.builder()
                .id(1L)
                .token("hash")
                .user(usuario)
                .used(false)
                .expiryDate(LocalDateTime.now().plusMinutes(10))
                .build();
        when(tokenRepository.findByToken(anyString())).thenReturn(Optional.of(token));
        when(passwordEncoder.encode("NuevaClave123!")).thenReturn("hash-nuevo");
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(i -> i.getArgument(0));
        when(tokenRepository.save(any(TokenResetContrasena.class))).thenAnswer(i -> i.getArgument(0));

        authService.resetPassword("token-plano", "NuevaClave123!");

        verify(notificacionService).crear(eq(7L), eq("SISTEMA"), eq("Contraseña actualizada"), anyString(), eq(null));
        verify(notificacionService).notificarRol(
                eq(List.of("ROLE_ADMIN")),
                eq("SEGURIDAD"),
                eq("Contraseña restablecida"),
                anyString(),
                eq("/usuarios"));
        verify(auditoriaService).registrar(eq("UPDATE"), eq("USUARIO"), eq(7L), anyString(), eq("recepcion"));
    }
}
