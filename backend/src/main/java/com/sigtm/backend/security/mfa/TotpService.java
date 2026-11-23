package com.sigtm.backend.security.mfa;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Locale;
import java.util.Map;

/**
 * Implementación mínima de TOTP (RFC 6238) compatible con Google
 * Authenticator, Authy y aplicaciones equivalentes.
 *
 * <p>Usa HMAC-SHA1, códigos de 6 dígitos y pasos de 30 segundos. La
 * verificación acepta una ventana de ±1 paso para tolerar pequeñas
 * diferencias de reloj.</p>
 */
@Service
public class TotpService {

    private static final String BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    private static final int TIME_STEP_SECONDS = 30;
    private static final int DIGITS = 6;
    private static final int SECRET_BYTES = 20;
    private static final SecureRandom RANDOM = new SecureRandom();

    /**
     * Genera un secreto Base32 de 160 bits.
     *
     * @return secreto listo para almacenar y mostrar al usuario
     */
    public String generarSecreto() {
        byte[] bytes = new byte[SECRET_BYTES];
        RANDOM.nextBytes(bytes);
        return base32Encode(bytes);
    }

    /**
     * Construye la URI que consumen las aplicaciones autenticadoras.
     *
     * @param issuer   nombre visible del sistema
     * @param username cuenta del usuario
     * @param secret   secreto Base32
     * @return URI {@code otpauth://}
     */
    public String construirUri(String issuer, String username, String secret) {
        String label = urlEncode(issuer + ":" + username);
        return "otpauth://totp/" + label
                + "?secret=" + secret
                + "&issuer=" + urlEncode(issuer)
                + "&algorithm=SHA1&digits=" + DIGITS + "&period=" + TIME_STEP_SECONDS;
    }

    /**
     * Genera un QR en formato data URI para mostrarlo en el navegador.
     *
     * @param contenido contenido del QR, normalmente la URI otpauth
     * @return imagen PNG codificada como {@code data:image/png;base64,...}
     */
    public String generarQrDataUri(String contenido) {
        try {
            QRCodeWriter writer = new QRCodeWriter();
            Map<EncodeHintType, Object> hints = Map.of(
                    EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M,
                    EncodeHintType.MARGIN, 1
            );
            BitMatrix matrix = writer.encode(contenido, BarcodeFormat.QR_CODE, 240, 240, hints);
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", output);
            return "data:image/png;base64,"
                    + Base64.getEncoder().encodeToString(output.toByteArray());
        } catch (WriterException | IOException ex) {
            throw new IllegalStateException("No se pudo generar el código QR de MFA.", ex);
        }
    }

    /**
     * Verifica un código TOTP con una ventana de ±1 paso.
     *
     * @param secret secreto Base32
     * @param code   código de 6 dígitos
     * @return {@code true} si el código es válido
     */
    public boolean verificar(String secret, String code) {
        if (secret == null || secret.isBlank() || code == null) {
            return false;
        }
        String normalized = code.replaceAll("\\s", "");
        if (!normalized.matches("\\d{6}")) {
            return false;
        }
        long counter = Instant.now().getEpochSecond() / TIME_STEP_SECONDS;
        for (long offset = -1; offset <= 1; offset++) {
            String expected = generarCodigo(secret, counter + offset);
            if (MessageDigest.isEqual(
                    normalized.getBytes(StandardCharsets.UTF_8),
                    expected.getBytes(StandardCharsets.UTF_8))) {
                return true;
            }
        }
        return false;
    }

    /**
     * Genera el código para un instante concreto. Se usa también en pruebas.
     *
     * @param secret secreto Base32
     * @param instant instante a evaluar
     * @return código de 6 dígitos
     */
    public String generarCodigo(String secret, Instant instant) {
        return generarCodigo(secret, instant.getEpochSecond() / TIME_STEP_SECONDS);
    }

    private String generarCodigo(String secret, long counter) {
        try {
            byte[] key = base32Decode(secret);
            byte[] data = new byte[8];
            long value = counter;
            for (int i = 7; i >= 0; i--) {
                data[i] = (byte) (value & 0xff);
                value >>= 8;
            }
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(key, "HmacSHA1"));
            byte[] hash = mac.doFinal(data);
            int offset = hash[hash.length - 1] & 0x0f;
            int binary = ((hash[offset] & 0x7f) << 24)
                    | ((hash[offset + 1] & 0xff) << 16)
                    | ((hash[offset + 2] & 0xff) << 8)
                    | (hash[offset + 3] & 0xff);
            return String.format(Locale.ROOT, "%06d", binary % 1_000_000);
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("No se pudo generar el código TOTP.", ex);
        }
    }

    private String base32Encode(byte[] data) {
        StringBuilder result = new StringBuilder();
        int buffer = 0;
        int bitsLeft = 0;
        for (byte value : data) {
            buffer = (buffer << 8) | (value & 0xff);
            bitsLeft += 8;
            while (bitsLeft >= 5) {
                result.append(BASE32_ALPHABET.charAt((buffer >> (bitsLeft - 5)) & 0x1f));
                bitsLeft -= 5;
            }
        }
        if (bitsLeft > 0) {
            result.append(BASE32_ALPHABET.charAt((buffer << (5 - bitsLeft)) & 0x1f));
        }
        return result.toString();
    }

    private byte[] base32Decode(String value) {
        String normalized = value.replace("=", "").replace(" ", "").toUpperCase(Locale.ROOT);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        int buffer = 0;
        int bitsLeft = 0;
        for (char character : normalized.toCharArray()) {
            int index = BASE32_ALPHABET.indexOf(character);
            if (index < 0) {
                throw new IllegalArgumentException("Secreto MFA inválido.");
            }
            buffer = (buffer << 5) | index;
            bitsLeft += 5;
            if (bitsLeft >= 8) {
                output.write((buffer >> (bitsLeft - 8)) & 0xff);
                bitsLeft -= 8;
            }
        }
        return output.toByteArray();
    }

    private String urlEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }
}
