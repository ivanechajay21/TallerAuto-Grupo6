package com.sigtm.backend.controller;

import com.sigtm.backend.dto.ForgotPasswordRequest;
import com.sigtm.backend.dto.JwtResponse;
import com.sigtm.backend.dto.LoginRequest;
import com.sigtm.backend.dto.MfaActivateRequest;
import com.sigtm.backend.dto.MfaDisableRequest;
import com.sigtm.backend.dto.MfaSetupRequest;
import com.sigtm.backend.dto.MfaVerifyRequest;
import com.sigtm.backend.dto.ResetPasswordRequest;
import com.sigtm.backend.model.Usuario;
import com.sigtm.backend.security.CookieNames;
import com.sigtm.backend.security.jwt.JwtUtils;
import com.sigtm.backend.security.mfa.MfaService;
import com.sigtm.backend.security.services.UserDetailsImpl;
import com.sigtm.backend.security.services.UserDetailsServiceImpl;
import com.sigtm.backend.service.AuthService;
import com.sigtm.backend.service.AuditoriaService;
import com.sigtm.backend.service.UsuarioService;
import com.sigtm.backend.security.LoginAttemptService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Endpoints de autenticación, recuperación de contraseña y perfil de sesión.
 *
 * <p>Es el único controlador de acceso público del API: {@code /ingresar},
 * {@code /olvidar-contrasena} y {@code /restablecer-contrasena} se invocan sin
 * token, y solo el login deja la sesión establecida en el contexto de seguridad.</p>
 */
@RestController
@RequestMapping("/api/autenticacion")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final AuthService authService;
    private final UsuarioService usuarioService;
    private final LoginAttemptService loginAttemptService;
    private final AuditoriaService auditoriaService;
    private final MfaService mfaService;
    private final UserDetailsServiceImpl userDetailsService;

    @Value("${app.cookie.secure:false}")
    private boolean secureCookie;

    @Value("${app.cookie.same-site:Strict}")
    private String sameSite;

    /**
     * Autentica al usuario y devuelve el token JWT de sesión.
     *
     * <p>Acceso público. Valida las credenciales contra el {@code AuthenticationManager},
     * registra el inicio de sesión en la auditoría y responde 401 si el usuario o la
     * contraseña no coinciden, o si la cuenta está desactivada.</p>
     *
     * @param loginRequest credenciales del usuario; usuario y contraseña son obligatorios
     * @return el token JWT junto con los datos del usuario y la lista de roles (200)
     */
    @PostMapping("/ingresar")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest,
                                              HttpServletResponse response) {
        String username = loginRequest.getUsername().trim();
        loginAttemptService.checkLoginAllowed(username);
        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(username, loginRequest.getPassword()));
        } catch (AuthenticationException ex) {
            int restantes = loginAttemptService.recordLoginFailure(username);
            auditoriaService.registrar("LOGIN_FALLIDO", "USUARIO", null,
                    "Intento fallido de inicio de sesión", username);
            if (ex instanceof org.springframework.security.authentication.BadCredentialsException) {
                String mensaje = restantes > 0
                        ? "Usuario o contraseña incorrectos. Te quedan " + restantes
                                + (restantes == 1 ? " intento." : " intentos.")
                        : "Usuario o contraseña incorrectos. Alcanzaste el límite de 5 intentos; espera 15 minutos.";
                throw new org.springframework.security.authentication.BadCredentialsException(mensaje);
            }
            throw ex;
        }
        loginAttemptService.recordLoginSuccess(username);
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Usuario usuario = usuarioService.obtenerEntidad(userDetails.getId());

        if (usuario != null && Boolean.TRUE.equals(usuario.getMfaEnabled())) {
            return ResponseEntity.ok(Map.of(
                    "mfaRequired", true,
                    "challengeToken", mfaService.crearDesafio(userDetails),
                    "message", "Ingresa el código de tu aplicación autenticadora."));
        }
        if (usuario != null && mfaService.requiereConfiguracion(usuario)) {
            return ResponseEntity.ok(Map.of(
                    "mfaSetupRequired", true,
                    "setupToken", mfaService.crearTokenConfiguracion(userDetails),
                    "message", "Configura Google Authenticator para proteger tu cuenta de administrador."));
        }

        SecurityContextHolder.getContext().setAuthentication(authentication);
        return respuestaJwt(authentication, response,
                Boolean.TRUE.equals(loginRequest.getRemember()));
    }

    private ResponseEntity<?> respuestaJwt(Authentication authentication, HttpServletResponse response,
                                           boolean remember) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        String lastLogin = usuarioService.registrarInicioSesion(userDetails.getId());
        String jwt = jwtUtils.generateJwtToken(authentication);
        guardarCookieSesion(response, jwt, remember);
        return ResponseEntity.ok(new JwtResponse(
                userDetails.getId(),
                userDetails.getUsername(),
                userDetails.getEmail(),
                roles(userDetails),
                userDetails.getName(),
                userDetails.getLastName(),
                userDetails.getRoleName(),
                userDetails.getAvatarUrl(),
                lastLogin));
    }

    private List<String> roles(UserDetailsImpl userDetails) {
        return userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList());
    }

    /**
     * Solicita el envío del enlace para restablecer la contraseña.
     *
     * <p>Acceso público. Por seguridad nunca revela si el correo está registrado:
     * devuelve 200 con el mismo mensaje en ambos casos. El token caduca según la
     * propiedad {@code app.reset-password.token-expiration-minutes}.</p>
     *
     * @param request correo electrónico desde el que se solicita la recuperación
     * @return un mensaje genérico de confirmación (200)
     */
    @PostMapping("/olvidar-contrasena")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        loginAttemptService.recordResetRequest(request.email());
        authService.forgotPassword(request.email());
        return ResponseEntity.ok(Map.of(
                "message", "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña."));
    }

    /**
     * Restablece la contraseña con el token recibido por correo.
     *
     * <p>Acceso público. El token debe existir, no haber caducado y no haber sido
     * usado todavía; al aceptarlo se marca como utilizado, se notifica al usuario
     * y se audita el cambio. Un token inválido, vencido o reutilizado produce 400.</p>
     *
     * @param request token de recuperación y nueva contraseña (mínimo 6 caracteres)
     * @return un mensaje de confirmación del restablecimiento (200)
     */
    @PostMapping("/restablecer-contrasena")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request.token(), request.newPassword());
        return ResponseEntity.ok(Map.of("message", "Contraseña restablecida correctamente. Ya puedes iniciar sesión."));
    }

    /**
     * Devuelve el perfil del usuario autenticado.
     *
     * <p>No exige permiso de módulo, pero sí una sesión válida: el identificador
     * se deriva del JWT, por lo que no acepta un identificador manipulable.</p>
     *
     * @return el mapa con los datos del perfil (200)
     * @throws com.sigtm.backend.exception.ResourceNotFoundException si el usuario no existe
     */
    @GetMapping("/perfil")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> me(Authentication authentication) {
        UserDetailsImpl usuario = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(usuarioService.obtenerPerfil(usuario.getId()));
    }

    /**
     * Confirma el segundo factor y entrega la sesión definitiva.
     */
    @PostMapping("/mfa/verificar")
    public ResponseEntity<?> verificarMfa(@Valid @RequestBody MfaVerifyRequest request,
                                          HttpServletResponse response) {
        Usuario usuario = mfaService.verificarDesafio(request.challengeToken(), request.code());
        UserDetailsImpl userDetails =
                (UserDetailsImpl) userDetailsService.loadUserByUsername(usuario.getUsername());
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                userDetails, null, userDetails.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(authentication);
        return respuestaJwt(authentication, response, Boolean.TRUE.equals(request.remember()));
    }

    /**
     * Inicia la configuración de MFA para un administrador.
     */
    @PostMapping("/mfa/configurar")
    public ResponseEntity<?> configurarMfa(@Valid @RequestBody MfaSetupRequest request) {
        return ResponseEntity.ok(mfaService.iniciarConfiguracion(request.setupToken()));
    }

    /**
     * Activa MFA tras verificar el primer código y entrega la sesión.
     */
    @PostMapping("/mfa/activar")
    public ResponseEntity<?> activarMfa(@Valid @RequestBody MfaActivateRequest request,
                                        HttpServletResponse response) {
        MfaService.Activacion activacion = mfaService.activar(request.setupToken(), request.code());
        UserDetailsImpl userDetails = (UserDetailsImpl) userDetailsService
                .loadUserByUsername(activacion.usuario().getUsername());
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                userDetails, null, userDetails.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(authentication);
        guardarCookieSesion(response, jwtUtils.generateJwtToken(authentication),
                Boolean.TRUE.equals(request.remember()));

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("id", userDetails.getId());
        respuesta.put("username", userDetails.getUsername());
        respuesta.put("email", userDetails.getEmail());
        respuesta.put("roles", roles(userDetails));
        respuesta.put("name", userDetails.getName());
        respuesta.put("lastName", userDetails.getLastName());
        respuesta.put("roleName", userDetails.getRoleName());
        respuesta.put("avatarUrl", userDetails.getAvatarUrl());
        respuesta.put("lastLogin", usuarioService.registrarInicioSesion(userDetails.getId()));
        respuesta.put("type", "Bearer");
        respuesta.put("recoveryCodes", activacion.recoveryCodes());
        return ResponseEntity.ok(respuesta);
    }

    /**
     * Devuelve si MFA está habilitado para la cuenta actual.
     */
    @GetMapping("/mfa/estado")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> estadoMfa(Authentication authentication) {
        UserDetailsImpl usuario = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(mfaService.estado(usuario.getId()));
    }

    /**
     * Desactiva MFA exigiendo contraseña y código vigente.
     */
    @PostMapping("/mfa/desactivar")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> desactivarMfa(Authentication authentication,
                                           @Valid @RequestBody MfaDisableRequest request) {
        UserDetailsImpl usuario = (UserDetailsImpl) authentication.getPrincipal();
        mfaService.desactivar(usuario.getId(), request.password(), request.code());
        return ResponseEntity.ok(Map.of("message", "MFA desactivado correctamente."));
    }

    /**
     * Fuerza la creación de la cookie CSRF antes del primer POST.
     */
    @GetMapping("/csrf")
    public ResponseEntity<Void> csrf() {
        return ResponseEntity.noContent().build();
    }

    /**
     * Elimina la cookie de sesión. El frontend también limpia su estado local.
     */
    @PostMapping("/salir")
    public ResponseEntity<?> salir(HttpServletResponse response) {
        borrarCookieSesion(response);
        return ResponseEntity.ok(Map.of("message", "Sesión cerrada correctamente."));
    }

    private void guardarCookieSesion(HttpServletResponse response, String jwt, boolean remember) {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie
                .from(CookieNames.SESSION, jwt)
                .httpOnly(true)
                .secure(secureCookie)
                .sameSite(sameSite)
                .path("/");
        if (remember) {
            builder.maxAge(Duration.ofMillis(jwtUtils.getExpirationMs()));
        }
        response.addHeader(HttpHeaders.SET_COOKIE, builder.build().toString());
    }

    private void borrarCookieSesion(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, ResponseCookie
                .from(CookieNames.SESSION, "")
                .httpOnly(true)
                .secure(secureCookie)
                .sameSite(sameSite)
                .path("/")
                .maxAge(Duration.ZERO)
                .build()
                .toString());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> handleIllegal(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", ex.getMessage()));
    }
}
