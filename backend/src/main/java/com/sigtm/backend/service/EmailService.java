package com.sigtm.backend.service;

import com.sigtm.backend.model.Configuracion;
import com.sigtm.backend.repository.ConfiguracionRepository;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.util.HtmlUtils;

import java.util.Locale;
import java.util.Properties;

/**
 * Envía correos en formato HTML y construye las plantillas de correo del sistema.
 *
 * <p>El servidor SMTP se toma de la configuración del taller; las credenciales se
 * mantienen fuera de la base de datos en {@code MAIL_USERNAME}/{@code MAIL_PASSWORD}.
 * Los envíos son «best effort»: si no hay credenciales o falla el servidor, solo se
 * registra el aviso en el log y nunca se interrumpe el flujo de negocio.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final ConfiguracionRepository configuracionRepository;

    @Value("${spring.mail.host:smtp.gmail.com}")
    private String defaultHost;

    @Value("${spring.mail.port:587}")
    private int defaultPort;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${spring.mail.password:}")
    private String mailPassword;

    @Value("${app.reset-password.base-url:http://localhost:3000}")
    private String baseUrl;

    /**
     * Envía un correo con el cuerpo en formato HTML.
     *
     * <p>No propaga errores: si las credenciales no están configuradas registra un
     * aviso y retorna {@code false}; si el envío falla, registra el error y retorna
     * {@code false}. El mensaje se compone con codificación UTF-8.</p>
     *
     * @param to       dirección de destino
     * @param subject  asunto del mensaje
     * @param htmlBody contenido del mensaje en HTML
     * @return {@code true} si el correo fue aceptado por el servidor SMTP
     */
    public boolean sendHtmlEmail(String to, String subject, String htmlBody) {
        if (!StringUtils.hasText(mailUsername) || !StringUtils.hasText(mailPassword)) {
            log.warn("Correo no enviado a '{}': configura MAIL_USERNAME/MAIL_PASSWORD para habilitar la recuperación.",
                    to);
            return false;
        }
        if (!StringUtils.hasText(to)) {
            log.warn("Correo no enviado: el destinatario está vacío.");
            return false;
        }

        try {
            Configuracion configuracion = configuracionRepository.findFirstByOrderByIdAsc().orElse(null);
            JavaMailSenderImpl sender = construirSender(configuracion);
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(remitente(configuracion));
            helper.setTo(to.trim());
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            sender.send(message);
            log.info("Correo enviado a {}", to);
            return true;
        } catch (MailAuthenticationException e) {
            log.error("Gmail/SMTP rechazó las credenciales al enviar a {}. " +
                    "Verifica MAIL_USERNAME y usa una App Password de Gmail en MAIL_PASSWORD.", to, e);
            return false;
        } catch (Exception e) {
            log.error("Error al enviar correo a {}", to, e);
            return false;
        }
    }

    /**
     * Comprueba si existen credenciales SMTP para intentar un envío.
     *
     * @return {@code true} cuando el usuario y la contraseña están configurados
     */
    public boolean estaConfigurado() {
        return StringUtils.hasText(mailUsername) && StringUtils.hasText(mailPassword);
    }

    /**
     * Construye el correo HTML con el enlace de restablecimiento de contraseña.
     *
     * <p>El enlace se compone con la ruta {@code /restablecer-contrasena?token=} sobre
     * la URL base configurada en {@code app.reset-password.base-url}.</p>
     *
     * @param name  nombre del usuario al que se saluda
     * @param token token de recuperación que se incrusta en el enlace
     * @return el cuerpo del mensaje listo para enviar
     */
    public String buildResetPasswordEmail(String name, String token) {
        String link = baseUrl + "/restablecer-contrasena?token=" + token;
        String nombreSeguro = HtmlUtils.htmlEscape(
                StringUtils.hasText(name) ? name.trim() : "usuario");
        String enlaceSeguro = HtmlUtils.htmlEscape(link);

        String plantilla = """
                <!DOCTYPE html>
                <html lang="es">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <meta name="x-apple-disable-message-reformatting">
                  <title>Recuperación de contraseña — SIGTM</title>
                </head>
                <body style="margin:0;padding:0;background:#f1f5f9;">
                  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
                    Restablece la contraseña de tu cuenta SIGTM. El enlace es válido por 30 minutos.
                  </div>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f1f5f9;padding:32px 12px;">
                    <tr>
                      <td align="center">
                        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
                          <tr>
                            <td style="height:6px;background:#2563eb;font-size:0;line-height:0;">&nbsp;</td>
                          </tr>
                          <tr>
                            <td style="padding:30px 36px 0;text-align:center;">
                              <div style="display:inline-block;width:56px;height:56px;line-height:56px;border-radius:16px;background:#eff6ff;color:#2563eb;font-size:28px;font-weight:700;">&#9881;</div>
                              <div style="margin-top:12px;color:#0f172a;font-size:24px;line-height:1.2;font-weight:700;letter-spacing:-0.5px;">SIGTM</div>
                              <div style="margin-top:5px;color:#64748b;font-size:12px;line-height:1.5;">Sistema Integral de Gestión de Taller Mecánico</div>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:26px 36px 0;">
                              <div style="height:1px;background:#e2e8f0;font-size:0;line-height:0;">&nbsp;</div>
                              <p style="margin:22px 0 6px;color:#2563eb;font-size:11px;line-height:1.4;font-weight:700;letter-spacing:1.4px;">SEGURIDAD DE LA CUENTA</p>
                              <h1 style="margin:0;color:#0f172a;font-size:22px;line-height:1.3;font-weight:700;">Recuperación de contraseña</h1>
                              <p style="margin:18px 0 0;color:#334155;font-size:15px;line-height:1.7;">Hola <strong style="color:#0f172a;">{{NAME}}</strong>,</p>
                              <p style="margin:10px 0 0;color:#475569;font-size:14px;line-height:1.7;">Recibimos una solicitud para restablecer la contraseña de tu cuenta. Por seguridad, el enlace de acceso es personal y de un solo uso.</p>
                              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:20px;background:#f8fafc;border:1px solid #e2e8f0;border-left:3px solid #2563eb;border-radius:8px;">
                                <tr>
                                  <td style="padding:14px 16px;color:#475569;font-size:13px;line-height:1.6;">
                                    <strong style="color:#0f172a;">Enlace seguro</strong><br>
                                    Válido por <strong>30 minutos</strong> desde la recepción de este correo.
                                  </td>
                                </tr>
                              </table>
                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:26px auto 0;">
                                <tr>
                                  <td align="center" bgcolor="#2563eb" style="border-radius:10px;">
                                    <a href="{{LINK}}" target="_blank" style="display:inline-block;padding:13px 30px;color:#ffffff;text-decoration:none;font-size:15px;line-height:1.2;font-weight:700;border-radius:10px;">Restablecer contraseña</a>
                                  </td>
                                </tr>
                              </table>
                              <p style="margin:18px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;text-align:center;">Si el botón no funciona, copia este enlace en tu navegador:</p>
                              <p style="margin:6px 0 0;color:#64748b;font-size:11px;line-height:1.5;text-align:center;word-break:break-all;">{{LINK}}</p>
                              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 0;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;">
                                <tr>
                                  <td style="padding:12px 15px;color:#92400e;font-size:12px;line-height:1.6;">
                                    <strong>¿No solicitaste este cambio?</strong><br>
                                    Ignora este correo. Tu contraseña no se modificará hasta que uses el enlace.
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:24px 36px 28px;">
                              <div style="height:1px;background:#e2e8f0;font-size:0;line-height:0;margin-bottom:18px;">&nbsp;</div>
                              <p style="margin:0;color:#64748b;font-size:12px;line-height:1.6;text-align:center;">
                                <strong style="color:#334155;">SIGTM</strong> · Gestión integral de taller mecánico<br>
                                Este mensaje se generó automáticamente. No respondas a este correo.
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
                """;
        return plantilla
                .replace("{{NAME}}", nombreSeguro)
                .replace("{{LINK}}", enlaceSeguro);
    }

    /**
     * Construye el correo HTML que anuncia novedades de una orden de trabajo.
     *
     * <p>El asunto del mensaje se toma de los primeros 80 caracteres de {@code message},
     * recortados con puntos suspensivos si excede esa longitud.</p>
     *
     * @param customerName nombre del cliente al que se saluda
     * @param orderNumber  número de la orden de trabajo
     * @param message      mensaje o novedad a comunicar
     * @return el cuerpo del mensaje HTML listo para enviar
     */
    public String buildOrderReadyEmail(String customerName, String orderNumber, String message) {
        return "<div style=\"font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;\">\n" +
                "  <div style=\"text-align:center;margin-bottom:20px;\">\n" +
                "    <div style=\"display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:16px;background:#2563eb;color:#ffffff;font-size:24px;\">\u2699</div>\n" +
                "    <h1 style=\"color:#0f172a;font-size:22px;margin:12px 0 4px;\">SIGTM</h1>\n" +
                "  </div>\n" +
                "  <h2 style=\"color:#0f172a;font-size:18px;\">%s</h2>\n" +
                "  <p style=\"color:#475569;font-size:14px;line-height:1.6;\">Hola <strong>%s</strong>,</p>\n" +
                "  <p style=\"color:#475569;font-size:14px;line-height:1.6;\">Tu orden de trabajo <strong>%s</strong> tiene novedades.</p>\n" +
                "  <p style=\"color:#475569;font-size:14px;line-height:1.6;\">%s</p>\n" +
                "</div>\n".formatted(subjectOf(message), customerName, orderNumber, message);
    }

    private JavaMailSenderImpl construirSender(Configuracion configuracion) {
        String host = configuracion != null && StringUtils.hasText(configuracion.getSmtpHost())
                ? configuracion.getSmtpHost().trim()
                : defaultHost;
        int port = configuracion != null && configuracion.getSmtpPuerto() != null
                ? configuracion.getSmtpPuerto()
                : defaultPort;
        String security = configuracion != null && StringUtils.hasText(configuracion.getSmtpSeguridad())
                ? configuracion.getSmtpSeguridad().trim().toUpperCase(Locale.ROOT)
                : "STARTTLS";

        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(host);
        sender.setPort(port);
        sender.setUsername(mailUsername);
        sender.setPassword(mailPassword);
        sender.setDefaultEncoding("UTF-8");

        Properties properties = sender.getJavaMailProperties();
        properties.put("mail.smtp.auth", "true");
        properties.put("mail.smtp.connectiontimeout", "5000");
        properties.put("mail.smtp.timeout", "5000");
        properties.put("mail.smtp.writetimeout", "5000");
        properties.put("mail.smtp.starttls.enable", String.valueOf("STARTTLS".equals(security)));
        properties.put("mail.smtp.ssl.enable", String.valueOf("SSL".equals(security)));
        return sender;
    }

    private String remitente(Configuracion configuracion) {
        if (configuracion != null && StringUtils.hasText(configuracion.getCorreoRemitente())) {
            return configuracion.getCorreoRemitente().trim();
        }
        return mailUsername;
    }

    private String subjectOf(String message) {
        return message.length() > 80 ? message.substring(0, 80) + "\u2026" : message;
    }
}
