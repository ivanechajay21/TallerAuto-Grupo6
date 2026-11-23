package com.sigtm.backend.security;

import com.sigtm.backend.security.jwt.JwtUtils;
import com.sigtm.backend.security.services.UserDetailsImpl;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import jakarta.servlet.http.Cookie;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.security.Key;
import java.util.Date;
import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Pruebas de seguridad del token JWT: token válido, ausente, alterado,
 * expirado, de usuario inexistente y con versión de sesión incorrecta.
 */
class JwtSeguridadTest extends SeguridadBaseTest {

    private static final String ISSUER = "sigtm-backend";
    private static final String AUDIENCE = "sigtm-web";

    @Autowired
    private JwtUtils jwtUtils;

    @Test
    @DisplayName("Un token válido permite acceder a un endpoint protegido")
    void tokenValido_permiteAcceso() throws Exception {
        String token = loginAdmin();

        mockMvc.perform(get("/api/clientes/paginado")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("La cookie HttpOnly de sesión permite acceder a un endpoint protegido")
    void cookieSesion_permiteAcceso() throws Exception {
        String token = loginAdmin();

        mockMvc.perform(get("/api/clientes/paginado")
                        .cookie(new Cookie(CookieNames.SESSION, token)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Sin token, un endpoint protegido devuelve 401")
    void sinToken_devuelve401() throws Exception {
        mockMvc.perform(get("/api/clientes/paginado"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Un token alterado devuelve 401")
    void tokenAlterado_devuelve401() throws Exception {
        String token = loginAdmin();
        String alterado = token + "x";

        mockMvc.perform(get("/api/clientes/paginado")
                        .header("Authorization", "Bearer " + alterado))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Un token expirado devuelve 401")
    void tokenExpirado_devuelve401() throws Exception {
        mockMvc.perform(get("/api/clientes/paginado")
                        .header("Authorization", "Bearer " + tokenExpirado()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Un token de un usuario inexistente devuelve 401")
    void tokenUsuarioInexistente_devuelve401() throws Exception {
        mockMvc.perform(get("/api/clientes/paginado")
                        .header("Authorization", "Bearer " + tokenPara("usuario_inexistente", 0)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Un token con tokenVersion distinta devuelve 401")
    void tokenVersionDistinta_devuelve401() throws Exception {
        UserDetailsImpl principal = new UserDetailsImpl(
                1L,
                "admin",
                "admin@tallerauto.com",
                "sin-uso",
                "Administrador",
                "del Sistema",
                "ROLE_ADMIN",
                null,
                true,
                99,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
        );

        String token = jwtUtils.generateJwtToken(
                new UsernamePasswordAuthenticationToken(
                        principal, null, principal.getAuthorities()));

        mockMvc.perform(get("/api/clientes/paginado")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Un token sin emisor ni audiencia válidos devuelve 401")
    void tokenSinEmisorNiAudiencia_devuelve401() throws Exception {
        long ahora = System.currentTimeMillis();
        String token = Jwts.builder()
                .setSubject("admin")
                .claim("tokenVersion", 0)
                .setIssuedAt(new Date(ahora))
                .setExpiration(new Date(ahora + 60_000))
                .signWith(clave(), SignatureAlgorithm.HS256)
                .compact();

        mockMvc.perform(get("/api/clientes/paginado")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    private String tokenExpirado() {
        long ahora = System.currentTimeMillis();
        return Jwts.builder()
                .setSubject("admin")
                .claim("tokenVersion", 0)
                .claim("type", "access")
                .setIssuer(ISSUER)
                .setAudience(AUDIENCE)
                .setIssuedAt(new Date(ahora - 120_000))
                .setExpiration(new Date(ahora - 60_000))
                .signWith(clave(), SignatureAlgorithm.HS256)
                .compact();
    }

    private String tokenPara(String username, int tokenVersion) {
        long ahora = System.currentTimeMillis();
        return Jwts.builder()
                .setSubject(username)
                .claim("tokenVersion", tokenVersion)
                .claim("type", "access")
                .setIssuer(ISSUER)
                .setAudience(AUDIENCE)
                .setIssuedAt(new Date(ahora))
                .setExpiration(new Date(ahora + 60_000))
                .signWith(clave(), SignatureAlgorithm.HS256)
                .compact();
    }

    private Key clave() {
        return Keys.hmacShaKeyFor(Decoders.BASE64.decode(JWT_SECRET));
    }
}
