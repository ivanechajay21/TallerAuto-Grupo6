package com.sigtm.backend.security.jwt;

import com.sigtm.backend.security.services.UserDetailsServiceImpl;
import com.sigtm.backend.security.services.UserDetailsImpl;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Filtro de autenticación basado en token JWT.
 *
 * <p>Se ejecuta una vez por petición antes del filtro de autenticación por
 * formulario y nombre de usuario. Extrae el token de la cabecera
 * {@code Authorization}, lo valida y, si es correcto, carga los datos del
 * usuario para establecer la autenticación en el contexto de seguridad.</p>
 *
 * <p>Las peticiones sin token o con un token inválido no se interrumpen: el
 * filtro delega en la cadena para que la configuración de seguridad decida si
 * la ruta requiere autenticación.</p>
 */
@Slf4j
public class AuthTokenFilter extends OncePerRequestFilter {

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private UserDetailsServiceImpl userDetailsService;

    /**
     * Valida el token de la petición y establece la autenticación del usuario.
     *
     * <p>Si el token es válido se carga el usuario correspondiente y se
     * registra en el contexto de seguridad con sus autoridades. Cualquier
     * fallo durante el proceso se registra y la petición continúa sin
     * autenticar.</p>
     *
     * @param request     Petición HTTP entrante.
     * @param response    Respuesta HTTP saliente.
     * @param filterChain Cadena de filtros a la que se delega al terminar.
     * @throws ServletException Si el filtro lanza un error de servlet.
     * @throws IOException      Si ocurre un error de entrada o salida.
     */
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String jwt = parseJwt(request);
            if (jwt != null && jwtUtils.validateJwtToken(jwt)) {
                String username = jwtUtils.getUserNameFromJwtToken(jwt);

                UserDetailsImpl userDetails = (UserDetailsImpl) userDetailsService.loadUserByUsername(username);
                if (!jwtUtils.belongsToCurrentUser(jwt, userDetails)) {
                    log.warn("JWT revocado o emitido para una versión de sesión anterior");
                    filterChain.doFilter(request, response);
                    return;
                }
                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                userDetails,
                                null,
                                userDetails.getAuthorities());
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);
                log.debug("JWT validado para el usuario {}", username);
            } else if (jwt != null) {
                log.warn("Se recibió un JWT inválido");
            }
        } catch (Exception e) {
            log.error("AuthTokenFilter: Cannot set user authentication: {}", e.getMessage(), e);
        }

        filterChain.doFilter(request, response);
    }

    private String parseJwt(HttpServletRequest request) {
        String headerAuth = request.getHeader("Authorization");
        if (StringUtils.hasText(headerAuth) && headerAuth.startsWith("Bearer ")) {
            return headerAuth.substring(7);
        }
        return null;
    }
}
