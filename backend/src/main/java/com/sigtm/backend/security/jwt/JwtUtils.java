package com.sigtm.backend.security.jwt;

import com.sigtm.backend.security.services.UserDetailsImpl;
import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
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

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.expiration-ms}")
    private int jwtExpirationMs;

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
                .setIssuedAt(new Date())
                .setExpiration(new Date((new Date()).getTime() + jwtExpirationMs))
                .signWith(key(), SignatureAlgorithm.HS256)
                .compact();
    }
    
    private Key key() {
        return Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtSecret));
    }

    /**
     * Extrae el nombre de usuario del sujeto del token.
     *
     * @param token Token JWT firmado que se desea leer.
     * @return Nombre de usuario almacenado en el sujeto del token.
     */
    public String getUserNameFromJwtToken(String token) {
        return Jwts.parserBuilder().setSigningKey(key()).build()
                   .parseClaimsJws(token).getBody().getSubject();
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
            Jwts.parserBuilder().setSigningKey(key()).build().parse(authToken);
            return true;
        } catch (MalformedJwtException e) {
            log.error("Invalid JWT token: {}", e.getMessage());
        } catch (ExpiredJwtException e) {
            log.error("JWT token is expired: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            log.error("JWT token is unsupported: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            log.error("JWT claims string is empty: {}", e.getMessage());
        }

        return false;
    }

    public boolean belongsToCurrentUser(String token, UserDetailsImpl user) {
        try {
            Claims claims = Jwts.parserBuilder().setSigningKey(key()).build()
                    .parseClaimsJws(token).getBody();
            Integer tokenVersion = claims.get("tokenVersion", Integer.class);
            return tokenVersion != null && tokenVersion == user.getTokenVersion();
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}
