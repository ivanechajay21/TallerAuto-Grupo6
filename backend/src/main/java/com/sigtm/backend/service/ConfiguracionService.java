package com.sigtm.backend.service;

import com.sigtm.backend.dto.ConfiguracionRequest;
import com.sigtm.backend.model.Configuracion;
import com.sigtm.backend.repository.ConfiguracionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Locale;

/**
 * Administra la configuración única del taller: datos de la empresa, servidor SMTP de
 * correo y preferencias de notificación.
 *
 * <p>Existe un solo registro de configuración. La lectura devuelve los valores por
 * defecto si todavía no hay fila, pero no escribe en la base de datos; la creación se
 * realiza al guardar por primera vez o en el arranque.</p>
 */
@Service
@RequiredArgsConstructor
public class ConfiguracionService {

    private static final String DEFAULT_TALLER_NOMBRE = "Mi Taller Mecánico";

    private final ConfiguracionRepository configuracionRepository;
    private final AuditoriaService auditoriaService;

    /**
     * Obtiene la configuración vigente del taller.
     *
     * <p>No tiene efectos secundarios: si no existe una fila devuelve una copia
     * transitoria con los valores por defecto. La persistencia ocurre en
     * {@link #actualizar(ConfiguracionRequest)} o en el inicializador de datos.</p>
     *
     * @return la configuración del sistema
     */
    @Transactional(readOnly = true)
    public Configuracion obtenerConfiguracion() {
        return configuracionRepository.findFirstByOrderByIdAsc().orElseGet(this::configuracionPorDefecto);
    }

    /**
     * Actualiza la configuración del taller.
     *
     * <p>Cada campo {@code null} conserva el valor actual. Los textos vacíos limpian
     * el dato; el nombre del taller vacío vuelve al valor por defecto. El cambio se
     * registra en la auditoría con la acción {@code UPDATE}.</p>
     *
     * @param actualizar nuevos valores de configuración
     * @return la configuración actualizada
     */
    @Transactional
    public Configuracion actualizar(ConfiguracionRequest actualizar) {
        Configuracion configuracion = configuracionRepository.findFirstByOrderByIdAsc()
                .orElseGet(this::configuracionPorDefecto);

        if (actualizar.tallerNombre() != null) {
            configuracion.setTallerNombre(StringUtils.hasText(actualizar.tallerNombre())
                    ? actualizar.tallerNombre().trim()
                    : DEFAULT_TALLER_NOMBRE);
        }
        if (actualizar.tallerLogo() != null) {
            configuracion.setTallerLogo(limpiar(actualizar.tallerLogo()));
        }
        if (actualizar.tallerRuc() != null) {
            configuracion.setTallerRuc(limpiar(actualizar.tallerRuc()));
        }
        if (actualizar.tallerDireccion() != null) {
            configuracion.setTallerDireccion(limpiar(actualizar.tallerDireccion()));
        }
        if (actualizar.tallerTelefono() != null) {
            configuracion.setTallerTelefono(limpiar(actualizar.tallerTelefono()));
        }
        if (actualizar.tallerCorreo() != null) {
            configuracion.setTallerCorreo(limpiar(actualizar.tallerCorreo()));
        }
        if (actualizar.tallerHorario() != null) {
            configuracion.setTallerHorario(limpiar(actualizar.tallerHorario()));
        }
        if (actualizar.correoTipo() != null) {
            configuracion.setCorreoTipo(limpiar(actualizar.correoTipo()));
        }
        if (actualizar.correoRemitente() != null) {
            configuracion.setCorreoRemitente(limpiar(actualizar.correoRemitente()));
        }
        if (actualizar.smtpHost() != null) {
            configuracion.setSmtpHost(limpiar(actualizar.smtpHost()));
        }
        if (actualizar.smtpPuerto() != null) {
            configuracion.setSmtpPuerto(actualizar.smtpPuerto());
        }
        if (actualizar.smtpSeguridad() != null) {
            configuracion.setSmtpSeguridad(limpiar(actualizar.smtpSeguridad()));
        }
        if (actualizar.notifConfirmacionCita() != null) {
            configuracion.setNotifConfirmacionCita(actualizar.notifConfirmacionCita());
        }
        if (actualizar.notifRecordatorio() != null) {
            configuracion.setNotifRecordatorio(actualizar.notifRecordatorio());
        }
        if (actualizar.notifVehiculoListo() != null) {
            configuracion.setNotifVehiculoListo(actualizar.notifVehiculoListo());
        }
        if (actualizar.notifAlertasInventario() != null) {
            configuracion.setNotifAlertasInventario(actualizar.notifAlertasInventario());
        }

        Configuracion guardada = configuracionRepository.save(configuracion);
        auditoriaService.registrar("UPDATE", "CONFIGURACION", guardada.getId(),
                "Configuración del sistema actualizada");
        return guardada;
    }

    /**
     * Indica si una notificación interna está habilitada en la configuración.
     *
     * <p>Las notificaciones de seguridad no se filtran. Si todavía no existe una fila
     * de configuración se mantiene el comportamiento histórico: todas habilitadas.</p>
     *
     * @param modulo módulo que origina la notificación
     * @param titulo título de la notificación
     * @return {@code true} si el tipo de aviso está habilitado
     */
    @Transactional(readOnly = true)
    public boolean notificacionActiva(String modulo, String titulo) {
        Configuracion configuracion = configuracionRepository.findFirstByOrderByIdAsc().orElse(null);
        if (configuracion == null) {
            return true;
        }

        String texto = (titulo == null ? "" : titulo).toLowerCase(Locale.ROOT);
        if (texto.contains("vehículo listo") || texto.contains("vehiculo listo")) {
            return !Boolean.FALSE.equals(configuracion.getNotifVehiculoListo());
        }
        if (texto.contains("stock bajo") || texto.contains("inventario")) {
            return !Boolean.FALSE.equals(configuracion.getNotifAlertasInventario());
        }
        if (texto.contains("recordatorio")) {
            return !Boolean.FALSE.equals(configuracion.getNotifRecordatorio());
        }
        if (texto.contains("cita")) {
            return !Boolean.FALSE.equals(configuracion.getNotifConfirmacionCita());
        }
        return true;
    }

    private Configuracion configuracionPorDefecto() {
        return Configuracion.builder()
                .tallerNombre(DEFAULT_TALLER_NOMBRE)
                .correoTipo("GMAIL")
                .smtpSeguridad("STARTTLS")
                .smtpPuerto(587)
                .notifConfirmacionCita(true)
                .notifRecordatorio(true)
                .notifVehiculoListo(true)
                .notifAlertasInventario(true)
                .build();
    }

    private String limpiar(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
