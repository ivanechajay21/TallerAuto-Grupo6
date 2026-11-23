package com.sigtm.backend.controller;

import com.sigtm.backend.security.LoginAttemptService;
import com.sigtm.backend.security.WebSecurityConfig;
import com.sigtm.backend.security.jwt.AuthEntryPointJwt;
import com.sigtm.backend.security.jwt.JwtUtils;
import com.sigtm.backend.security.mfa.MfaService;
import com.sigtm.backend.security.services.UserDetailsImpl;
import com.sigtm.backend.security.services.UserDetailsServiceImpl;
import com.sigtm.backend.service.AuthService;
import com.sigtm.backend.service.AuditoriaService;
import com.sigtm.backend.service.UsuarioService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Pruebas de la cadena de seguridad real para el perfil de sesión.
 *
 * <p>El endpoint {@code /api/autenticacion/perfil} vive bajo el prefijo público
 * de autenticación, pero debe exigir un JWT válido. La prueba usa los filtros de
 * Spring Security (sin {@code addFilters = false}) para detectar una regresión
 * que lo dejara accesible de forma anónima.</p>
 */
@WebMvcTest(controllers = AuthController.class)
@Import({WebSecurityConfig.class, AuthEntryPointJwt.class})
class AuthControllerSecurityTest {

    @Autowired private MockMvc mockMvc;

    @MockitoBean private AuthenticationManager authenticationManager;
    @MockitoBean private JwtUtils jwtUtils;
    @MockitoBean private AuthService authService;
    @MockitoBean private MfaService mfaService;
    @MockitoBean private UsuarioService usuarioService;
    @MockitoBean private AuditoriaService auditoriaService;
    @MockitoBean private LoginAttemptService loginAttemptService;
    @MockitoBean private UserDetailsServiceImpl userDetailsService;

    @Test
    @DisplayName("GET /api/autenticacion/perfil sin token devuelve 401")
    void perfil_sinToken_401() throws Exception {
        mockMvc.perform(get("/api/autenticacion/perfil"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/autenticacion/perfil con sesión devuelve el perfil")
    void perfil_conSesion_ok() throws Exception {
        UserDetailsImpl usuario = new UserDetailsImpl(
                1L, "admin", "admin@sigtm.test", "hash", "Admin", "SIGTM",
                "ROLE_ADMIN", null, true, 0,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(usuario, null, usuario.getAuthorities());

        when(usuarioService.obtenerPerfil(1L)).thenReturn(Map.of("id", 1, "username", "admin"));

        mockMvc.perform(get("/api/autenticacion/perfil").with(authentication(auth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("admin"));
    }

    private UsernamePasswordAuthenticationToken sesionAdmin() {
        UserDetailsImpl usuario = new UserDetailsImpl(
                1L, "admin", "admin@sigtm.test", "hash", "Admin", "SIGTM",
                "ROLE_ADMIN", null, true, 0,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        return new UsernamePasswordAuthenticationToken(
                usuario, null, usuario.getAuthorities());
    }

    @Test
    @DisplayName("POST /api/autenticacion/ingresar devuelve el token y los datos del usuario")
    void ingresar_ok() throws Exception {
        UsernamePasswordAuthenticationToken auth = sesionAdmin();
        when(authenticationManager.authenticate(any())).thenReturn(auth);
        when(jwtUtils.generateJwtToken(auth)).thenReturn("jwt-de-prueba");
        when(usuarioService.registrarInicioSesion(1L))
                .thenReturn("2026-11-08T10:15:30");

        mockMvc.perform(post("/api/autenticacion/ingresar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"admin123\"}"))
                .andExpect(status().isOk())
                .andExpect(header().stringValues(HttpHeaders.SET_COOKIE,
                        hasItem(containsString("SIGTM_TOKEN=jwt-de-prueba"))))
                .andExpect(jsonPath("$.username").value("admin"))
                .andExpect(jsonPath("$.roles[0]").value("ROLE_ADMIN"));

        verify(loginAttemptService).checkLoginAllowed("admin");
        verify(loginAttemptService).recordLoginSuccess("admin");
    }

    @Test
    @DisplayName("POST /api/autenticacion/ingresar sin contraseña devuelve 400")
    void ingresar_sinPassword_400() throws Exception {
        mockMvc.perform(post("/api/autenticacion/ingresar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/autenticacion/olvidar-contrasena responde con mensaje genérico")
    void olvidarContrasena_ok() throws Exception {
        mockMvc.perform(post("/api/autenticacion/olvidar-contrasena")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@sigtm.test\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").exists());

        verify(loginAttemptService).recordResetRequest("admin@sigtm.test");
        verify(authService).forgotPassword("admin@sigtm.test");
    }

    @Test
    @DisplayName("POST /api/autenticacion/olvidar-contrasena con correo inválido devuelve 400")
    void olvidarContrasena_correoInvalido_400() throws Exception {
        mockMvc.perform(post("/api/autenticacion/olvidar-contrasena")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"correo-invalido\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/autenticacion/restablecer-contrasena confirma el cambio")
    void restablecerContrasena_ok() throws Exception {
        mockMvc.perform(post("/api/autenticacion/restablecer-contrasena")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"token-vigente\",\"newPassword\":\"NuevaClave123!\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").exists());

        verify(authService).resetPassword("token-vigente", "NuevaClave123!");
    }

    @Test
    @DisplayName("POST /api/autenticacion/restablecer-contrasena con clave corta devuelve 400")
    void restablecerContrasena_claveCorta_400() throws Exception {
        mockMvc.perform(post("/api/autenticacion/restablecer-contrasena")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"token-vigente\",\"newPassword\":\"corta\"}"))
                .andExpect(status().isBadRequest());
    }
}
