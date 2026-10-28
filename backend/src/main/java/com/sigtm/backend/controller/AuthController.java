package com.sigtm.backend.controller;

import com.sigtm.backend.dto.ForgotPasswordRequest;
import com.sigtm.backend.dto.JwtResponse;
import com.sigtm.backend.dto.LoginRequest;
import com.sigtm.backend.dto.ResetPasswordRequest;
import com.sigtm.backend.security.jwt.JwtUtils;
import com.sigtm.backend.security.services.UserDetailsImpl;
import com.sigtm.backend.service.AuthService;
import com.sigtm.backend.service.UsuarioService;
import com.sigtm.backend.security.LoginAttemptService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.*;

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
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        loginAttemptService.checkLoginAllowed(loginRequest.getUsername());
        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword()));
        } catch (AuthenticationException ex) {
            loginAttemptService.recordLoginFailure(loginRequest.getUsername());
            throw ex;
        }
        loginAttemptService.recordLoginSuccess(loginRequest.getUsername());

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(authentication);

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        List<String> roles = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList());

        // Registrar última sesión
        String lastLogin = usuarioService.registrarInicioSesion(userDetails.getId());

        return ResponseEntity.ok(new JwtResponse(jwt,
                userDetails.getId(),
                userDetails.getUsername(),
                userDetails.getEmail(),
                roles,
                userDetails.getName(),
                userDetails.getLastName(),
                userDetails.getRoleName(),
                userDetails.getAvatarUrl(),
                lastLogin));
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
     * <p>No exige permiso de módulo: basta con una sesión válida, por lo que el
     * frontend lo usa para hidratar los datos de la sesión vigente. Un
     * se deriva del JWT, por lo que no acepta un identificador manipulable.</p>
     *
     * @return el mapa con los datos del perfil (200)
     * @throws com.sigtm.backend.exception.ResourceNotFoundException si el usuario no existe
     */
    @GetMapping("/perfil")
    public ResponseEntity<?> me(Authentication authentication) {
        UserDetailsImpl usuario = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(usuarioService.obtenerPerfil(usuario.getId()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> handleIllegal(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", ex.getMessage()));
    }
}
