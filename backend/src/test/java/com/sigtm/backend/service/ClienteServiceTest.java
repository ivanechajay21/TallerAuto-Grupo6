package com.sigtm.backend.service;

import com.sigtm.backend.exception.DuplicateResourceException;
import com.sigtm.backend.exception.ResourceNotFoundException;
import com.sigtm.backend.model.Cliente;
import com.sigtm.backend.repository.ClienteRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Pruebas de caracterización del padrón existente de clientes. */
@ExtendWith(MockitoExtension.class)
class ClienteServiceTest {
    @Mock private ClienteRepository clientes;
    @Mock private CodeGeneratorService codigos;
    @Mock private AuditoriaService auditoria;

    private ClienteService service() { return new ClienteService(clientes, codigos, auditoria); }

    @Test
    void creaClienteCompletandoCodigoFechaYEstadoPorDefecto() {
        Cliente cliente = cliente(null, "74125896", "Ana", "López");
        cliente.setRegistrationDate(null);
        cliente.setActive(null);
        when(clientes.findByDocumentNumber("74125896")).thenReturn(Optional.empty());
        when(codigos.nextCode("CLI")).thenReturn("CLI-000021");
        when(clientes.save(any())).thenAnswer(i -> {
            Cliente saved = i.getArgument(0); saved.setId(21L); return saved;
        });

        Cliente created = service().crearCliente(cliente);

        assertEquals("CLI-000021", created.getCode());
        assertTrue(created.getActive());
        assertNotNull(created.getRegistrationDate());
        verify(auditoria).registrar(eq("CREATE"), eq("CLIENTE"), eq(21L), contains("Ana López"));
    }

    @Test
    void rechazaDocumentoQueYaPerteneceAOtroCliente() {
        when(clientes.findByDocumentNumber("74125896")).thenReturn(Optional.of(cliente(7L, "74125896", "Ana", "López")));

        assertThrows(DuplicateResourceException.class, () -> service().crearCliente(cliente(null, "74125896", "Luis", "Pérez")));

        verify(clientes, never()).save(any());
        verifyNoInteractions(codigos, auditoria);
    }

    @Test
    void actualizaDatosEditablesSinCambiarCodigoNiDocumento() {
        Cliente actual = cliente(4L, "12345678", "Ana", "López");
        actual.setCode("CLI-000004");
        Cliente cambios = cliente(null, "99999999", "María", "Torres");
        cambios.setPhone("999111222"); cambios.setEmail("maria@example.test"); cambios.setActive(false);
        when(clientes.findById(4L)).thenReturn(Optional.of(actual));
        when(clientes.save(actual)).thenReturn(actual);

        Cliente updated = service().actualizarCliente(4L, cambios);

        assertEquals("CLI-000004", updated.getCode());
        assertEquals("12345678", updated.getDocumentNumber());
        assertEquals("María", updated.getFirstName());
        assertEquals("Torres", updated.getLastName());
        assertFalse(updated.getActive());
        verify(auditoria).registrar(eq("UPDATE"), eq("CLIENTE"), eq(4L), contains("María Torres"));
    }

    @Test
    void desactivaClienteActivoYRegistraAuditoriaUnaSolaVez() {
        Cliente actual = cliente(6L, "12345678", "Ana", "López");
        actual.setCode("CLI-000006"); actual.setActive(true);
        when(clientes.findById(6L)).thenReturn(Optional.of(actual));

        service().eliminarCliente(6L);

        assertFalse(actual.getActive());
        verify(clientes).save(actual);
        verify(auditoria).registrar(eq("DELETE"), eq("CLIENTE"), eq(6L), contains("desactivado"));
    }

    @Test
    void noPersisteNiAuditaBajaDeClienteYaInactivoYFallaSiNoExiste() {
        Cliente inactive = cliente(6L, "12345678", "Ana", "López"); inactive.setActive(false);
        when(clientes.findById(6L)).thenReturn(Optional.of(inactive));
        service().eliminarCliente(6L);
        verify(clientes, never()).save(any()); verifyNoInteractions(auditoria);

        when(clientes.findById(99L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service().obtenerPorId(99L));
    }

    private Cliente cliente(Long id, String document, String firstName, String lastName) {
        return Cliente.builder().id(id).documentNumber(document).firstName(firstName).lastName(lastName).active(true).build();
    }
}
