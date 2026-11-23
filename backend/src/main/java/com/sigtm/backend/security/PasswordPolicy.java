package com.sigtm.backend.security;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;

/**
 * Política central de contraseñas para altas, cambios y restablecimientos.
 *
 * <p>Exige una longitud mínima de 12 caracteres y un máximo de 72 bytes
 * (límite efectivo de BCrypt), al menos una mayúscula, una minúscula, un
 * dígito y un carácter no alfanumérico. También rechaza contraseñas comunes
 * y evita que la contraseña contenga el nombre de usuario o la parte local
 * del correo.</p>
 */
public final class PasswordPolicy {

    private static final int MIN_LENGTH = 12;
    private static final int MAX_BCRYPT_BYTES = 72;

    private static final List<String> COMMON_PASSWORDS = List.of(
            "123456789012", "1234567890123", "password1234", "contrasena123",
            "administrador", "administrator", "qwerty123456", "abc123456789",
            "password123!", "admin123456!", "bienvenido123", "welcome12345",
            "iloveyou1234", "cambiar12345", "temporal1234", "temporal123!"
    );

    private PasswordPolicy() {
    }

    /**
     * Valida una contraseña nueva.
     *
     * @param password contraseña en texto plano
     * @param username nombre de usuario asociado; puede ser {@code null}
     * @param email    correo asociado; puede ser {@code null}
     * @throws IllegalArgumentException si la contraseña no cumple la política
     */
    public static void validate(String password, String username, String email) {
        if (password == null || password.isBlank()) {
            throw new IllegalArgumentException("La contraseña es obligatoria.");
        }
        if (password.length() < MIN_LENGTH) {
            throw new IllegalArgumentException("La contraseña debe tener al menos 12 caracteres.");
        }
        if (password.getBytes(StandardCharsets.UTF_8).length > MAX_BCRYPT_BYTES) {
            throw new IllegalArgumentException("La contraseña no puede superar los 72 bytes.");
        }
        if (!password.chars().anyMatch(Character::isUpperCase)) {
            throw new IllegalArgumentException("La contraseña debe incluir al menos una mayúscula.");
        }
        if (!password.chars().anyMatch(Character::isLowerCase)) {
            throw new IllegalArgumentException("La contraseña debe incluir al menos una minúscula.");
        }
        if (!password.chars().anyMatch(Character::isDigit)) {
            throw new IllegalArgumentException("La contraseña debe incluir al menos un número.");
        }
        if (password.chars().allMatch(Character::isLetterOrDigit)) {
            throw new IllegalArgumentException("La contraseña debe incluir al menos un símbolo.");
        }

        String normalized = password.toLowerCase(Locale.ROOT);
        if (COMMON_PASSWORDS.contains(normalized)) {
            throw new IllegalArgumentException("La contraseña es demasiado común. Elige una diferente.");
        }
        if (containsIdentifier(normalized, username)) {
            throw new IllegalArgumentException("La contraseña no debe contener el nombre de usuario.");
        }
        if (containsIdentifier(normalized, localPart(email))) {
            throw new IllegalArgumentException("La contraseña no debe contener el correo del usuario.");
        }
    }

    private static boolean containsIdentifier(String password, String identifier) {
        if (identifier == null) {
            return false;
        }
        String value = identifier.trim().toLowerCase(Locale.ROOT);
        return value.length() >= 3 && password.contains(value);
    }

    private static String localPart(String email) {
        if (email == null) {
            return null;
        }
        int at = email.indexOf('@');
        return at > 0 ? email.substring(0, at) : email;
    }
}
