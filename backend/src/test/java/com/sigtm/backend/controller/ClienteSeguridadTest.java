package com.sigtm.backend.controller;

import com.sigtm.backend.security.WebSecurityConfig;
import com.sigtm.backend.security.jwt.AuthEntryPointJwt;
import com.sigtm.backend.security.jwt.JwtUtils;
import com.sigtm.backend.security.services.UserDetailsServiceImpl;
import com.sigtm.backend.service.ClienteService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ClienteController.class)
@AutoConfigureMockMvc
@Import({WebSecurityConfig.class, AuthEntryPointJwt.class})
public class ClienteSeguridadTest {
    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ClienteService clienteService;

    @MockitoBean
    private UserDetailsServiceImpl userDetailsService;

    @MockitoBean
    private JwtUtils jwtUtils;

    @Test
    void sinTokenNoPuedeListarCliente() throws Exception {
        mockMvc.perform(get("/api/clientes")).andExpect(status().isUnauthorized());
        verifyNoInteractions(clienteService);
    }

    @Test
    @WithMockUser(authorities = "CLIENTES:VER")
    void usuarioConSoloLecturaNoPuedeCrearClientes() throws Exception {
        mockMvc.perform(post("/api/clientes")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                        "documentNumber": "12345678",
                        "firstName": "Ana",
                        "lastName": "López"
                        }
                        """))
                .andExpect(status().isForbidden());
        verifyNoInteractions(clienteService);

    }
}
