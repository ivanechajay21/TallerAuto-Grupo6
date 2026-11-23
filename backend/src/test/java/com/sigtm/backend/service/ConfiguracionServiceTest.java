package com.sigtm.backend.service;

import com.sigtm.backend.dto.ConfiguracionRequest;
import com.sigtm.backend.model.Configuracion;
import com.sigtm.backend.repository.ConfiguracionRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Pruebas de lectura segura y actualización parcial de la configuración. */
@ExtendWith(MockitoExtension.class)
class ConfiguracionServiceTest {

    @Mock private ConfiguracionRepository configuracionRepository;
    @Mock private AuditoriaService auditoriaService;

    @InjectMocks private ConfiguracionService configuracionService;

    @Test
    @DisplayName("la lectura devuelve valores por defecto sin escribir en la base de datos")
    void lecturaSinFilaNoEscribe() {
        when(configuracionRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.empty());

        Configuracion configuracion = configuracionService.obtenerConfiguracion();

        assertEquals("Mi Taller Mecánico", configuracion.getTallerNombre());
        assertEquals("GMAIL", configuracion.getCorreoTipo());
        assertEquals(587, configuracion.getSmtpPuerto());
        verify(configuracionRepository, never()).save(any(Configuracion.class));
    }

    @Test
    @DisplayName("una actualización parcial conserva logo, RUC y datos de contacto")
    void actualizacionParcialConservaCampos() {
        Configuracion actual = Configuracion.builder()
                .id(1L)
                .tallerNombre("Taller Central")
                .tallerLogo("data:image/png;base64,abc")
                .tallerRuc("20123456789")
                .tallerDireccion("Av. Principal 123")
                .tallerTelefono("999888777")
                .tallerCorreo("taller@gmail.com")
                .correoTipo("GMAIL")
                .smtpHost("smtp.gmail.com")
                .smtpPuerto(587)
                .smtpSeguridad("STARTTLS")
                .notifRecordatorio(true)
                .build();
        when(configuracionRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(actual));
        when(configuracionRepository.save(any(Configuracion.class))).thenAnswer(i -> i.getArgument(0));

        ConfiguracionRequest patch = new ConfiguracionRequest(
                null, null, null, null, null, null, null, null, null, null, null, null,
                null, false, null, null);

        Configuracion guardada = configuracionService.actualizar(patch);

        assertEquals("Taller Central", guardada.getTallerNombre());
        assertEquals("data:image/png;base64,abc", guardada.getTallerLogo());
        assertEquals("20123456789", guardada.getTallerRuc());
        assertEquals("Av. Principal 123", guardada.getTallerDireccion());
        assertEquals("999888777", guardada.getTallerTelefono());
        assertEquals("taller@gmail.com", guardada.getTallerCorreo());
        assertFalse(guardada.getNotifRecordatorio());
        verify(configuracionRepository).save(actual);
    }

    @Test
    @DisplayName("las banderas de notificación se consultan por tipo de aviso")
    void banderasDeNotificacionSeAplican() {
        Configuracion configuracion = Configuracion.builder()
                .id(1L)
                .notifVehiculoListo(false)
                .notifAlertasInventario(true)
                .build();
        when(configuracionRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(configuracion));

        assertFalse(configuracionService.notificacionActiva("ORDENES", "Vehículo listo"));
        assertTrue(configuracionService.notificacionActiva("INVENTARIO", "Stock bajo"));
        assertTrue(configuracionService.notificacionActiva("SEGURIDAD", "Contraseña restablecida"));
    }

    @Test
    @DisplayName("si no existe fila, la primera actualización crea la configuración")
    void primeraActualizacionCreaConfiguracion() {
        when(configuracionRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.empty());
        when(configuracionRepository.save(any(Configuracion.class))).thenAnswer(i -> i.getArgument(0));

        Configuracion guardada = configuracionService.actualizar(new ConfiguracionRequest(
                "Taller Nuevo", null, null, null, null, null, null, null, null, null, null, null,
                null, null, null, null));

        assertNotNull(guardada);
        assertEquals("Taller Nuevo", guardada.getTallerNombre());
        verify(configuracionRepository).save(any(Configuracion.class));
    }
}
