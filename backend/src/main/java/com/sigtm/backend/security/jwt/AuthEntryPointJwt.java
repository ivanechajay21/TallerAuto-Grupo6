package com.sigtm.backend.security.jwt;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * Punto de entrada de autenticación para las peticiones no autorizadas.
 *
 * <p>Se invoca cuando una petición llega sin credenciales válidas o con
 * credenciales insuficientes. Escribe una respuesta JSON con el estado
 * 401 Unauthorized, el motivo del fallo y la ruta solicitada.</p>
 */
@Component
@Slf4j
public class AuthEntryPointJwt implements AuthenticationEntryPoint {

    /**
     * Escribe la respuesta JSON de error 401 Unauthorized.
     *
     * @param request       Petición recibida que no superó la autenticación.
     * @param response      Respuesta HTTP donde se escribe el cuerpo JSON.
     * @param authException Excepción de autenticación con el motivo del rechazo.
     * @throws IOException      Si falla la escritura del cuerpo de la respuesta.
     * @throws ServletException Si el contenedor no puede procesar la respuesta.
     */
    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException authException)
            throws IOException, ServletException {
        log.warn("Solicitud no autenticada en {}: {}", request.getRequestURI(),
                authException.getClass().getSimpleName());

        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);

        final Map<String, Object> body = new HashMap<>();
        body.put("status", HttpServletResponse.SC_UNAUTHORIZED);
        body.put("error", "Unauthorized");
        body.put("message", "No autenticado o sesión expirada.");
        body.put("path", request.getServletPath());

        final ObjectMapper mapper = new ObjectMapper();
        mapper.writeValue(response.getOutputStream(), body);
    }
}
