package com.sigtm.backend.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.sigtm.backend.model.Usuario;
import com.sigtm.backend.repository.UsuarioRepository;
import com.sigtm.backend.security.mfa.MfaService;
import com.sigtm.backend.security.mfa.TotpService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Pruebas del segundo factor TOTP en el flujo real de login. */
class MfaSeguridadTest extends SeguridadBaseTest {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private TotpService totpService;

    @Autowired
    private MfaService mfaService;

    @AfterEach
    void restaurarConfiguracion() {
        ReflectionTestUtils.setField(mfaService, "requiredForAdmin", false);
    }

    @Test
    @DisplayName("un administrador sin MFA recibe el alta obligatoria y puede activarla")
    void altaObligatoriaDeMfa() throws Exception {
        ReflectionTestUtils.setField(mfaService, "requiredForAdmin", true);

        String loginBody = objectMapper.writeValueAsString(Map.of(
                "username", "admin",
                "password", "admin123"
        ));
        String loginResponse = mockMvc.perform(post("/api/autenticacion/ingresar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mfaSetupRequired").value(true))
                .andReturn().getResponse().getContentAsString();
        String setupToken = objectMapper.readTree(loginResponse).get("setupToken").asText();

        String setupBody = objectMapper.writeValueAsString(Map.of("setupToken", setupToken));
        String setupResponse = mockMvc.perform(post("/api/autenticacion/mfa/configurar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(setupBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.secret").isNotEmpty())
                .andExpect(jsonPath("$.qrImage").isNotEmpty())
                .andReturn().getResponse().getContentAsString();
        String secret = objectMapper.readTree(setupResponse).get("secret").asText();

        String code = totpService.generarCodigo(secret, Instant.now());
        String activateBody = objectMapper.writeValueAsString(Map.of(
                "setupToken", setupToken,
                "code", code
        ));
        mockMvc.perform(post("/api/autenticacion/mfa/activar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(activateBody))
                .andExpect(status().isOk())
                .andExpect(header().stringValues(HttpHeaders.SET_COOKIE,
                        hasItem(containsString("SIGTM_TOKEN="))))
                .andExpect(jsonPath("$.recoveryCodes.length()").value(8));
    }

    @Test
    @DisplayName("un administrador con MFA recibe un desafío y puede completar el login")
    void loginConMfa() throws Exception {
        Usuario admin = usuarioRepository.findByUsername("admin").orElseThrow();
        String secret = totpService.generarSecreto();
        admin.setMfaEnabled(true);
        admin.setMfaSecret(secret);
        usuarioRepository.save(admin);

        String loginBody = objectMapper.writeValueAsString(Map.of(
                "username", "admin",
                "password", "admin123"
        ));
        String loginResponse = mockMvc.perform(post("/api/autenticacion/ingresar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mfaRequired").value(true))
                .andExpect(jsonPath("$.challengeToken").isNotEmpty())
                .andReturn().getResponse().getContentAsString();

        JsonNode challenge = objectMapper.readTree(loginResponse);
        String challengeToken = challenge.get("challengeToken").asText();

        mockMvc.perform(get("/api/clientes/paginado")
                        .header("Authorization", "Bearer " + challengeToken))
                .andExpect(status().isUnauthorized());

        String code = totpService.generarCodigo(secret, Instant.now());
        String verifyBody = objectMapper.writeValueAsString(Map.of(
                "challengeToken", challengeToken,
                "code", code
        ));
        mockMvc.perform(post("/api/autenticacion/mfa/verificar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(verifyBody))
                .andExpect(status().isOk())
                .andExpect(header().stringValues(HttpHeaders.SET_COOKIE,
                        hasItem(containsString("SIGTM_TOKEN="))))
                .andExpect(jsonPath("$.username").value("admin"));
    }

    @Test
    @DisplayName("un código MFA incorrecto no entrega la sesión")
    void codigoMfaIncorrecto() throws Exception {
        Usuario admin = usuarioRepository.findByUsername("admin").orElseThrow();
        admin.setMfaEnabled(true);
        admin.setMfaSecret(totpService.generarSecreto());
        usuarioRepository.save(admin);

        String loginBody = objectMapper.writeValueAsString(Map.of(
                "username", "admin",
                "password", "admin123"
        ));
        String loginResponse = mockMvc.perform(post("/api/autenticacion/ingresar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String challengeToken = objectMapper.readTree(loginResponse)
                .get("challengeToken").asText();

        String verifyBody = objectMapper.writeValueAsString(Map.of(
                "challengeToken", challengeToken,
                "code", "000000"
        ));
        mockMvc.perform(post("/api/autenticacion/mfa/verificar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(verifyBody))
                .andExpect(status().isUnauthorized());
    }
}
