package com.sigtm.backend.security.jwt;

import com.sigtm.backend.security.services.UserDetailsImpl;
import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

/**
 * Utilidades para la emisión y validación de tokens JWT.
 *
 * <p>Genera tokens firmados con el algoritmo HS256 a partir de la
 * autenticación del usuario y utiliza la clave secreta y el tiempo de
 * expiración configurados en la aplicación para firmar y verificar los
 * tokens.</p>
 */
@Component
@Slf4j
public class JwtUtils {

    private static final long MFA_CHALLENGE_MS = 5 * 60 * 1000L;
    private static final long MFA_SETUP_MS = 10 * 60 * 1000L;

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.expiration-ms}")
    private int jwtExpirationMs;

    @Value("${app.jwt.issuer:sigtm-backend}")
    private String jwtIssuer;

    @Value("${app.jwt.audience:sigtm-web}")
    private String jwtAudience;

    public long getExpirationMs() {
        return jwtExpirationMs;
    }

    @PostConstruct
    void validarSecreto() {
        try {
            if (Decoders.BASE64.decode(jwtSecret).length < 32) {
                throw new IllegalStateException(
                        "JWT_SECRET debe decodificar al menos 32 bytes para HS256.");
            }
        } catch (IllegalStateException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            throw new IllegalStateException(
                    "JWT_SECRET no es un valor Base64 válido.", ex);
        }
    }

    /**
     * Genera un token JWT para el usuario autenticado.
     *
     * @param authentication Autenticación cuyo sujeto se usa como
     *                       identificador del token.
     * @return Token JWT firmado, con fecha de emisión y de expiración.
     */
    public String generateJwtToken(Authentication authentication) {

        UserDetailsImpl userPrincipal = (UserDetailsImpl) authentication.getPrincipal();

        return Jwts.builder()
                .setSubject((userPrincipal.getUsername()))
                .claim("tokenVersion", userPrincipal.getTokenVersion())
                .claim("type", "access")
                .setIssuer(jwtIssuer)
                .setAudience(jwtAudience)
                .setIssuedAt(new Date())
                .setExpiration(new Date((new Date()).getTime() + jwtExpirationMs))
                .signWith(key(), SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * Emite un token temporal para completar el segundo factor.
     *
     * @param user usuario que ya superó la contraseña
     * @param id   identificador de un solo uso del desafío
     * @return JWT con tipo {@code mfa}
     */
    public String generateMfaChallengeToken(UserDetailsImpl user, String id) {
        return generateScopedToken(user, id, "mfa", MFA_CHALLENGE_MS);
    }

    /**
     * Emite un token temporal para que un administrador configure su MFA.
     *
     * @param user usuario que ya superó la contraseña
     * @param id   identificador de un solo uso de la configuración
     * @return JWT con tipo {@code mfa_setup}
     */
    public String generateMfaSetupToken(UserDetailsImpl user, String id) {
        return generateScopedToken(user, id, "mfa_setup", MFA_SETUP_MS);
    }

    private String generateScopedToken(UserDetailsImpl user, String id, String type, long durationMs) {
        return Jwts.builder()
                .setSubject(user.getUsername())
                .setId(id)
                .claim("tokenVersion", user.getTokenVersion())
                .claim("type", type)
                .setIssuer(jwtIssuer)
                .setAudience(jwtAudience)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + durationMs))
                .signWith(key(), SignatureAlgorithm.HS256)
                .compact();
    }
    
    private Key key() {
        return Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtSecret));
    }

    private JwtParser parser() {
        return parser("access");
    }

    private JwtParser parser(String type) {
        return Jwts.parserBuilder()
                .setSigningKey(key())
                .requireIssuer(jwtIssuer)
                .requireAudience(jwtAudience)
                .require("type", type)
                .build();
    }

    /**
     * Valida y extrae la información de un token temporal de MFA.
     *
     * @param token token emitido para el desafío
     * @return usuario, versión de sesión e identificador del desafío
     */
    public MfaToken parseMfaChallenge(String token) {
        return parseMfaToken(token, "mfa");
    }

    /**
     * Valida y extrae la información de un token temporal de configuración.
     *
     * @param token token emitido para configurar MFA
     * @return usuario, versión de sesión e identificador de la configuración
     */
    public MfaToken parseMfaSetup(String token) {
        return parseMfaToken(token, "mfa_setup");
    }

    private MfaToken parseMfaToken(String token, String type) {
        Claims claims = parser(type).parseClaimsJws(token).getBody();
        Number version = claims.get("tokenVersion", Number.class);
        return new MfaToken(claims.getSubject(), version == null ? -1 : version.intValue(),
                claims.getId());
    }

    /**
     * Extrae el nombre de usuario del sujeto del token.
     *
     * @param token Token JWT firmado que se desea leer.
     * @return Nombre de usuario almacenado en el sujeto del token.
     */
    public String getUserNameFromJwtToken(String token) {
        return parser().parseClaimsJws(token).getBody().getSubject();
    }

    /**
     * Comprueba la validez y la firma de un token JWT.
     *
     * @param authToken Token recibido en la cabecera de autorización.
     * @return {@code true} si el token es correcto y no ha expirado;
     *         {@code false} en caso contrario.
     */
    public boolean validateJwtToken(String authToken) {
        try {
            parser().parseClaimsJws(authToken);
            return true;
        } catch (MalformedJwtException e) {
            log.error("Invalid JWT token: {}", e.getMessage());
        } catch (ExpiredJwtException e) {
            log.error("JWT token is expired: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            log.error("JWT token is unsupported: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            log.error("JWT claims string is empty: {}", e.getMessage());
        } catch (JwtException e) {
            log.warn("JWT rechazado: {}", e.getMessage());
        }

        return false;
    }

    public boolean belongsToCurrentUser(String token, UserDetailsImpl user) {
        try {
            Claims claims = parser().parseClaimsJws(token).getBody();
            Integer tokenVersion = claims.get("tokenVersion", Integer.class);
            return tokenVersion != null && tokenVersion == user.getTokenVersion();
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    /**
     * Datos extraídos de un token temporal de MFA.
     */
    public record MfaToken(String username, int tokenVersion, String id) {
    }
}
