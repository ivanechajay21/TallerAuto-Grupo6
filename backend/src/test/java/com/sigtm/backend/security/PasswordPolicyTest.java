package com.sigtm.backend.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Pruebas de la política central de contraseñas. */
class PasswordPolicyTest {

    @Test
    @DisplayName("acepta una contraseña robusta que no contiene datos del usuario")
    void aceptaContrasenaRobusta() {
        assertDoesNotThrow(() ->
                PasswordPolicy.validate("Sigtm#Taller2026", "admin", "admin@taller.test"));
    }

    @Test
    @DisplayName("rechaza contraseñas cortas")
    void rechazaContrasenaCorta() {
        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> PasswordPolicy.validate("Ab1!corta", "admin", "admin@taller.test"));
        assertTrue(error.getMessage().contains("12"));
    }

    @Test
    @DisplayName("rechaza contraseñas sin mayúscula, minúscula, número o símbolo")
    void rechazaContrasenaSinCategorias() {
        assertThrows(IllegalArgumentException.class,
                () -> PasswordPolicy.validate("sinmayuscula123!", "admin", "admin@taller.test"));
        assertThrows(IllegalArgumentException.class,
                () -> PasswordPolicy.validate("SINMINUSCULA123!", "admin", "admin@taller.test"));
        assertThrows(IllegalArgumentException.class,
                () -> PasswordPolicy.validate("SinNumero!!!!!", "admin", "admin@taller.test"));
        assertThrows(IllegalArgumentException.class,
                () -> PasswordPolicy.validate("SinSimbolo1234", "admin", "admin@taller.test"));
    }

    @Test
    @DisplayName("rechaza contraseñas que contienen el usuario o el correo")
    void rechazaDatosDelUsuario() {
        assertThrows(IllegalArgumentException.class,
                () -> PasswordPolicy.validate("Admin#Segura2026", "admin", "admin@taller.test"));
        assertThrows(IllegalArgumentException.class,
                () -> PasswordPolicy.validate("Taller#Segura2026", "otro", "taller@taller.test"));
    }

    @Test
    @DisplayName("rechaza contraseñas comunes")
    void rechazaContrasenaComun() {
        assertThrows(IllegalArgumentException.class,
                () -> PasswordPolicy.validate("Password123!", "otro", "otro@taller.test"));
    }

    @Test
    @DisplayName("rechaza contraseñas que superan el límite de BCrypt")
    void rechazaContrasenaDemasiadoLarga() {
        String larga = "Aa1!" + "x".repeat(70);
        assertThrows(IllegalArgumentException.class,
                () -> PasswordPolicy.validate(larga, "otro", "otro@taller.test"));
    }
}
