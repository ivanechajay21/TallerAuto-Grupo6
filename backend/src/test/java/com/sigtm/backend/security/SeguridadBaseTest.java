package com.sigtm.backend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sigtm.backend.model.Rol;
import com.sigtm.backend.model.Usuario;
import com.sigtm.backend.repository.RolRepository;
import com.sigtm.backend.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;

import java.util.List;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Base común para las pruebas de seguridad.
 *
 * <p>Levanta MySQL con Testcontainers, activa los datos base de roles/permisos y
 * ofrece utilidades para iniciar sesión y crear usuarios de prueba. Cada prueba
 * se ejecuta dentro de una transacción que se revierte al finalizar.</p>
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@Transactional
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
abstract class SeguridadBaseTest {

    protected static final String JWT_SECRET =
            "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWYwMTIzNDU2Nzg5YWJjZGVmMDEyMzQ1Njc4OWFiY2RlZg==";

    protected static final String PASSWORD_PRUEBA = "ClaveSegura123";

    @Container
    static final MySQLContainer MYSQL = new MySQLContainer("mysql:8.0")
            .withDatabaseName("sigtm_security_test")
            .withUsername("sigtm_test")
            .withPassword("sigtm_test");

    @DynamicPropertySource
    static void propiedadesDePrueba(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
        registry.add("spring.datasource.username", MYSQL::getUsername);
        registry.add("spring.datasource.password", MYSQL::getPassword);
        registry.add("spring.datasource.driver-class-name", MYSQL::getDriverClassName);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "update");
        registry.add("JWT_SECRET", () -> JWT_SECRET);
        registry.add("app.seed.enabled", () -> "true");
        // Las pruebas de autorización no deben exigir el alta de MFA al admin.
        registry.add("app.mfa.required-for-admin", () -> "false");
    }

    @Autowired
    protected MockMvc mockMvc;

    protected final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    protected UsuarioRepository usuarios;

    @Autowired
    protected RolRepository roles;

    @Autowired
    protected PasswordEncoder passwordEncoder;

    /**
     * Inicia sesión contra el endpoint real y devuelve el JWT.
     */
    protected String login(String username, String password) throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "username", username,
                "password", password
        ));

        MvcResult result = mockMvc.perform(post("/api/autenticacion/ingresar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn();

        String prefix = CookieNames.SESSION + "=";
        List<String> setCookies = result.getResponse().getHeaders(HttpHeaders.SET_COOKIE);
        for (String setCookie : setCookies) {
            if (setCookie.startsWith(prefix)) {
                return setCookie.substring(prefix.length()).split(";", 2)[0];
            }
        }
        throw new IllegalStateException("El login no emitió la cookie de sesión.");
    }

    protected String loginAdmin() throws Exception {
        return login("admin", "admin123");
    }

    protected String loginMecanico() throws Exception {
        return login("mecanico", "mecanico123");
    }

    protected String loginRecepcion() throws Exception {
        return login("recepcion", "recepcion123");
    }

    /**
     * Crea un usuario con el rol indicado. Se usa en pruebas que necesitan dos
     * identidades distintas con los mismos permisos.
     */
    protected Usuario crearUsuario(String username, String roleName) {
        Rol rol = roles.findByName(roleName)
                .orElseThrow(() -> new IllegalStateException("No existe el rol " + roleName));

        Usuario usuario = Usuario.builder()
                .name("Usuario")
                .lastName(username)
                .username(username)
                .email(username + "@seguridad.test")
                .password(passwordEncoder.encode(PASSWORD_PRUEBA))
                .role(rol)
                .active(true)
                .build();

        return usuarios.save(usuario);
    }

    protected Usuario crearMecanico(String username) {
        return crearUsuario(username, "ROLE_MECHANIC");
    }
}
