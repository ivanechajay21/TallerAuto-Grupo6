package com.sigtm.backend.security.mfa;

import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;
import com.sigtm.backend.dto.MfaSetupResponse;
import com.sigtm.backend.exception.ResourceNotFoundException;
import com.sigtm.backend.model.Usuario;
import com.sigtm.backend.repository.UsuarioRepository;
import com.sigtm.backend.security.LoginAttemptService;
import com.sigtm.backend.security.jwt.JwtUtils;
import com.sigtm.backend.security.services.UserDetailsImpl;
import com.sigtm.backend.service.AuditoriaService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Gestiona el segundo factor TOTP de las cuentas administrativas.
 *
 * <p>El secreto se guarda en la cuenta, pero MFA solo queda habilitado después
 * de que el usuario demuestra que puede generar un código válido. Los códigos
 * de recuperación se almacenan como hashes y se consumen una sola vez.</p>
 */
@Service
@RequiredArgsConstructor
public class MfaService {

    private static final int RECOVERY_CODE_COUNT = 8;
    private static final int RECOVERY_CODE_LENGTH = 8;
    private static final String RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final TotpService totpService;
    private final JwtUtils jwtUtils;
    private final LoginAttemptService loginAttemptService;
    private final AuditoriaService auditoriaService;

    @Value("${app.mfa.required-for-admin:true}")
    private boolean requiredForAdmin;

    @Value("${app.mfa.issuer:SIGTM}")
    private String issuer;

    private final Cache<String, Boolean> challenges = CacheBuilder.newBuilder()
            .expireAfterWrite(Duration.ofMinutes(5))
            .build();

    private final Cache<String, Boolean> setups = CacheBuilder.newBuilder()
            .expireAfterWrite(Duration.ofMinutes(10))
            .build();

    /**
     * Indica si el usuario debe configurar MFA antes de continuar.
     */
    public boolean requiereConfiguracion(Usuario usuario) {
        return requiredForAdmin
                && usuario != null
                && usuario.getRole() != null
                && "ROLE_ADMIN".equals(usuario.getRole().getName())
                && !Boolean.TRUE.equals(usuario.getMfaEnabled());
    }

    /**
     * Crea un token temporal para configurar MFA después del login.
     */
    public String crearTokenConfiguracion(UserDetailsImpl usuario) {
        String id = UUID.randomUUID().toString();
        setups.put(id, Boolean.TRUE);
        return jwtUtils.generateMfaSetupToken(usuario, id);
    }

    /**
     * Crea un desafío temporal para el segundo factor.
     */
    public String crearDesafio(UserDetailsImpl usuario) {
        String id = UUID.randomUUID().toString();
        challenges.put(id, Boolean.TRUE);
        return jwtUtils.generateMfaChallengeToken(usuario, id);
    }

    /**
     * Genera un secreto y el QR para la aplicación autenticadora.
     */
    @Transactional
    public MfaSetupResponse iniciarConfiguracion(String setupToken) {
        JwtUtils.MfaToken token = validarTokenConfiguracion(setupToken);
        Usuario usuario = cargarUsuario(token);
        if (Boolean.TRUE.equals(usuario.getMfaEnabled())) {
            throw new IllegalArgumentException("MFA ya está habilitado para esta cuenta.");
        }

        String secret = totpService.generarSecreto();
        usuario.setMfaSecret(secret);
        usuarioRepository.save(usuario);

        String uri = totpService.construirUri(issuer, usuario.getUsername(), secret);
        auditoriaService.registrar("MFA_CONFIGURACION", "USUARIO", usuario.getId(),
                "Configuración de MFA iniciada", usuario.getUsername());
        return new MfaSetupResponse(secret, uri, totpService.generarQrDataUri(uri));
    }

    /**
     * Activa MFA después de verificar el primer código.
     *
     * @return usuario actualizado y códigos de recuperación en texto plano
     */
    @Transactional
    public Activacion activar(String setupToken, String code) {
        JwtUtils.MfaToken token = validarTokenConfiguracion(setupToken);
        Usuario usuario = cargarUsuario(token);
        if (Boolean.TRUE.equals(usuario.getMfaEnabled())) {
            throw new IllegalArgumentException("MFA ya está habilitado para esta cuenta.");
        }
        if (!totpService.verificar(usuario.getMfaSecret(), code)) {
            loginAttemptService.recordLoginFailure(usuario.getUsername());
            auditoriaService.registrar("MFA_FALLIDO", "USUARIO", usuario.getId(),
                    "Código inválido al activar MFA", usuario.getUsername());
            throw new BadCredentialsException("El código de verificación no es válido.");
        }

        List<String> recoveryCodes = generarCodigosRecuperacion();
        usuario.setMfaEnabled(true);
        usuario.setMfaRecoveryCodes(hashRecoveryCodes(recoveryCodes));
        usuarioRepository.save(usuario);
        setups.invalidate(token.id());
        loginAttemptService.recordLoginSuccess(usuario.getUsername());
        auditoriaService.registrar("MFA_ACTIVADO", "USUARIO", usuario.getId(),
                "MFA activado", usuario.getUsername());
        return new Activacion(usuario, recoveryCodes);
    }

    /**
     * Verifica un desafío de MFA y devuelve el usuario autenticado.
     */
    @Transactional
    public Usuario verificarDesafio(String challengeToken, String code) {
        JwtUtils.MfaToken token;
        try {
            token = jwtUtils.parseMfaChallenge(challengeToken);
        } catch (RuntimeException ex) {
            throw new BadCredentialsException("El desafío de verificación expiró. Inicia sesión nuevamente.");
        }

        loginAttemptService.checkLoginAllowed(token.username());
        if (!challenges.asMap().containsKey(token.id())) {
            throw new BadCredentialsException("El desafío de verificación ya fue utilizado o expiró.");
        }

        Usuario usuario = cargarUsuario(token);
        if (!Boolean.TRUE.equals(usuario.getMfaEnabled())
                || !codigoValido(usuario, code)) {
            loginAttemptService.recordLoginFailure(usuario.getUsername());
            auditoriaService.registrar("MFA_FALLIDO", "USUARIO", usuario.getId(),
                    "Código inválido en el segundo factor", usuario.getUsername());
            throw new BadCredentialsException("El código de verificación no es válido.");
        }

        challenges.invalidate(token.id());
        loginAttemptService.recordLoginSuccess(usuario.getUsername());
        auditoriaService.registrar("LOGIN_MFA", "USUARIO", usuario.getId(),
                "Inicio de sesión con segundo factor", usuario.getUsername());
        return usuario;
    }

    /**
     * Desactiva MFA. Exige contraseña y un código vigente.
     */
    @Transactional
    public void desactivar(Long userId, String password, String code) {
        Usuario usuario = usuarioRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        if (!Boolean.TRUE.equals(usuario.getMfaEnabled())) {
            throw new IllegalArgumentException("MFA no está habilitado para esta cuenta.");
        }
        if (!passwordEncoder.matches(password, usuario.getPassword())) {
            throw new BadCredentialsException("La contraseña no es correcta.");
        }
        if (!codigoValido(usuario, code)) {
            throw new BadCredentialsException("El código de verificación no es válido.");
        }

        usuario.setMfaEnabled(false);
        usuario.setMfaSecret(null);
        usuario.setMfaRecoveryCodes(null);
        usuarioRepository.save(usuario);
        auditoriaService.registrar("MFA_DESACTIVADO", "USUARIO", usuario.getId(),
                "MFA desactivado", usuario.getUsername());
    }

    /**
     * Devuelve el estado actual de MFA del usuario autenticado.
     */
    @Transactional(readOnly = true)
    public Estado estado(Long userId) {
        Usuario usuario = usuarioRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        return new Estado(Boolean.TRUE.equals(usuario.getMfaEnabled()), requiredForAdmin);
    }

    private JwtUtils.MfaToken validarTokenConfiguracion(String setupToken) {
        JwtUtils.MfaToken token;
        try {
            token = jwtUtils.parseMfaSetup(setupToken);
        } catch (RuntimeException ex) {
            throw new IllegalArgumentException("El enlace de configuración expiró. Inicia sesión nuevamente.");
        }
        if (!setups.asMap().containsKey(token.id())) {
            throw new IllegalArgumentException("El enlace de configuración ya fue utilizado o expiró.");
        }
        return token;
    }

    private Usuario cargarUsuario(JwtUtils.MfaToken token) {
        Usuario usuario = usuarioRepository.findByUsername(token.username())
                .orElseThrow(() -> new BadCredentialsException("La cuenta ya no está disponible."));
        if (token.tokenVersion() != usuario.getTokenVersion()) {
            throw new BadCredentialsException("La sesión cambió. Inicia sesión nuevamente.");
        }
        return usuario;
    }

    private boolean codigoValido(Usuario usuario, String code) {
        if (totpService.verificar(usuario.getMfaSecret(), code)) {
            return true;
        }
        return consumirCodigoRecuperacion(usuario, code);
    }

    private boolean consumirCodigoRecuperacion(Usuario usuario, String code) {
        if (usuario.getMfaRecoveryCodes() == null || code == null) {
            return false;
        }
        String normalized = code.replaceAll("[^A-Za-z0-9]", "").toUpperCase(Locale.ROOT);
        if (normalized.length() != RECOVERY_CODE_LENGTH) {
            return false;
        }
        String hash = hash(normalized);
        List<String> restantes = new ArrayList<>();
        boolean encontrado = false;
        for (String stored : usuario.getMfaRecoveryCodes().split("\\R")) {
            if (!stored.isBlank() && !stored.equals(hash)) {
                restantes.add(stored);
            } else if (stored.equals(hash)) {
                encontrado = true;
            }
        }
        if (encontrado) {
            usuario.setMfaRecoveryCodes(String.join("\n", restantes));
            usuarioRepository.save(usuario);
        }
        return encontrado;
    }

    private List<String> generarCodigosRecuperacion() {
        List<String> codes = new ArrayList<>();
        for (int i = 0; i < RECOVERY_CODE_COUNT; i++) {
            StringBuilder code = new StringBuilder();
            for (int j = 0; j < RECOVERY_CODE_LENGTH; j++) {
                code.append(RECOVERY_ALPHABET.charAt(RANDOM.nextInt(RECOVERY_ALPHABET.length())));
            }
            String value = code.toString();
            codes.add(value.substring(0, 4) + "-" + value.substring(4));
        }
        return codes;
    }

    private String hashRecoveryCodes(List<String> codes) {
        return codes.stream()
                .map(code -> hash(code.replace("-", "")))
                .reduce((a, b) -> a + "\n" + b)
                .orElse("");
    }

    private String hash(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception ex) {
            throw new IllegalStateException("No se pudo procesar el código de recuperación.", ex);
        }
    }

    /** Resultado de activar MFA. */
    public record Activacion(Usuario usuario, List<String> recoveryCodes) {
    }

    /** Estado de MFA para la interfaz. */
    public record Estado(boolean enabled, boolean requiredForAdmin) {
    }
}
