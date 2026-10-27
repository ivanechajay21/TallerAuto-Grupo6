package com.sigtm.backend.service;

import com.sigtm.backend.model.TokenResetContrasena;
import com.sigtm.backend.model.Usuario;
import com.sigtm.backend.repository.TokenResetContrasenaRepository;
import com.sigtm.backend.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Optional;

/**
 * Gestiona la recuperación de contraseña: emite tokens de un solo uso y permite
 * restablecer la credencial del usuario.
 *
 * <p>El flujo es deliberadamente silencioso: la solicitud nunca revela si un correo
 * está registrado, para no filtrar información de cuentas existentes.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final TokenResetContrasenaRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final NotificacionService notificacionService;
    private final AuditoriaService auditoriaService;

    @Value("${app.reset-password.token-expiration-minutes:30}")
    private long tokenExpirationMinutes;

    private static final SecureRandom RANDOM = new SecureRandom();

    /**
     * Inicia la recuperación de contraseña. Nunca revela si el correo existe o no.
     *
     * <p>Si el correo no está registrado, solo se deja traza en el log y el método
     * termina sin efecto. En caso contrario genera un token aleatorio de 32 bytes con
     * {@code SecureRandom}, lo persiste como no usado con la vigencia configurada en
     * {@code app.reset-password.token-expiration-minutes} (30 minutos por defecto) y
     * envía el correo con el enlace de restablecimiento.</p>
     *
     * @param email correo electrónico del usuario que solicita el restablecimiento
     */
    @Transactional
    public void forgotPassword(String email) {
        Optional<Usuario> usuarioOpcional = usuarioRepository.findByEmail(email);
        if (usuarioOpcional.isEmpty()) {
            log.info("Solicitud de reset para correo no registrado: {}", email);
            return;
        }
        Usuario usuario = usuarioOpcional.get();

        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String token = HexFormat.of().formatHex(bytes);

        TokenResetContrasena tokenReset = TokenResetContrasena.builder()
                .token(hashToken(token))
                .user(usuario)
                .expiryDate(LocalDateTime.now().plus(Duration.ofMinutes(tokenExpirationMinutes)))
                .used(false)
                .build();
        tokenRepository.save(tokenReset);

        emailService.sendHtmlEmail(
                usuario.getEmail(),
                "Recuperación de contraseña — SIGTM",
                emailService.buildResetPasswordEmail(usuario.getName(), token));
    }

    /**
     * Restablece la contraseña del usuario asociado a un token de recuperación.
     *
     * <p>El token debe existir, no estar vencido y no haber sido usado; en cualquiera de
     * esos casos se lanza {@code RuntimeException}. Tras el cambio el token se marca como
     * consumido, se genera una notificación interna para el usuario y se registra el
     * evento {@code UPDATE} en la auditoría.</p>
     *
     * @param token       token de recuperación recibido por correo
     * @param newPassword nueva contraseña en texto plano, que se almacenará codificada
     */
    @Transactional
    public void resetPassword(String token, String newPassword) {
        TokenResetContrasena tokenReset = tokenRepository.findByToken(hashToken(token))
                .orElseThrow(() -> new RuntimeException("El enlace de recuperación no es válido."));
        if (!tokenReset.isValid()) {
            throw new RuntimeException("El enlace de recuperación ha expirado o ya fue utilizado.");
        }

        Usuario usuario = tokenReset.getUser();
        usuario.setPassword(passwordEncoder.encode(newPassword));
        usuario.setTokenVersion(usuario.getTokenVersion() + 1);
        usuarioRepository.save(usuario);

        tokenReset.setUsed(true);
        tokenRepository.save(tokenReset);

        notificacionService.crear(usuario.getId(), "SISTEMA", "Contraseña actualizada",
                "Tu contraseña fue restablecida correctamente.", null);

        auditoriaService.registrar("UPDATE", "USUARIO", usuario.getId(),
                "Contraseña restablecida para el usuario " + usuario.getUsername(), usuario.getUsername());

        log.info("Contraseña restablecida para usuario {}", usuario.getUsername());
    }

    private String hashToken(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 no disponible", e);
        }
    }
}
