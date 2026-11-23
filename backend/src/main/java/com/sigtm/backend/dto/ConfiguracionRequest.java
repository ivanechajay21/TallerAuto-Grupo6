package com.sigtm.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Datos editables de la configuración del taller.
 *
 * <p>Los campos son opcionales para permitir actualizaciones parciales: un valor
 * {@code null} conserva el dato actual y un texto vacío lo limpia. Las validaciones
 * evitan persistir correos, RUC, teléfonos o parámetros SMTP inválidos.</p>
 */
public record ConfiguracionRequest(
        @Size(max = 150, message = "El nombre del taller no puede superar 150 caracteres")
        String tallerNombre,

        @Size(max = 4_000_000, message = "El logo es demasiado grande")
        String tallerLogo,

        @Pattern(regexp = "^$|^\\d{11}$", message = "El RUC debe tener 11 dígitos")
        String tallerRuc,

        @Size(max = 255, message = "La dirección no puede superar 255 caracteres")
        String tallerDireccion,

        @Pattern(regexp = "^$|^[0-9+()\\-\\s]{6,30}$", message = "El teléfono no tiene un formato válido")
        String tallerTelefono,

        @Email(message = "El correo de contacto no es válido")
        @Size(max = 120, message = "El correo de contacto no puede superar 120 caracteres")
        String tallerCorreo,

        @Size(max = 150, message = "El horario no puede superar 150 caracteres")
        String tallerHorario,

        @Pattern(regexp = "(?i)^$|^(GMAIL|SMTP)$", message = "El proveedor de correo debe ser GMAIL o SMTP")
        String correoTipo,

        @Email(message = "El correo remitente no es válido")
        @Size(max = 120, message = "El correo remitente no puede superar 120 caracteres")
        String correoRemitente,

        @Size(max = 150, message = "El servidor SMTP no puede superar 150 caracteres")
        String smtpHost,

        @Min(value = 1, message = "El puerto SMTP debe ser mayor que cero")
        @Max(value = 65535, message = "El puerto SMTP no puede superar 65535")
        Integer smtpPuerto,

        @Pattern(regexp = "(?i)^$|^(NONE|STARTTLS|SSL)$", message = "La seguridad SMTP debe ser NONE, STARTTLS o SSL")
        String smtpSeguridad,

        Boolean notifConfirmacionCita,
        Boolean notifRecordatorio,
        Boolean notifVehiculoListo,
        Boolean notifAlertasInventario
) {
}
