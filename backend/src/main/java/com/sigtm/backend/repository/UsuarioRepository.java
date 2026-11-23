package com.sigtm.backend.repository;

import com.sigtm.backend.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Acceso a datos de los usuarios del sistema.
 *
 * <p>El nombre de usuario y el correo son claves de acceso únicas, por lo que se ofrece tanto su
 * búsqueda como su verificación de disponibilidad antes de crear una cuenta.</p>
 */
@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long>, JpaSpecificationExecutor<Usuario> {
    /**
     * Busca un usuario por su nombre de usuario.
     *
     * @param username nombre de usuario.
     * @return el usuario encontrado o vacío si el nombre no existe.
     */
    Optional<Usuario> findByUsername(String username);

    /**
     * Busca un usuario por su correo electrónico.
     *
     * @param email correo electrónico del usuario.
     * @return el usuario encontrado o vacío si el correo no está registrado.
     */
    Optional<Usuario> findByEmail(String email);

    /**
     * Busca un usuario por su correo sin distinguir mayúsculas ni minúsculas.
     *
     * @param email correo electrónico del usuario.
     * @return el usuario encontrado o vacío si el correo no está registrado.
     */
    Optional<Usuario> findByEmailIgnoreCase(String email);

    /**
     * Comprueba si ya existe un usuario con el nombre de usuario indicado.
     *
     * @param username nombre de usuario a verificar.
     * @return {@code true} si el nombre ya está en uso.
     */
    Boolean existsByUsername(String username);

    /**
     * Comprueba si ya existe un usuario con el correo electrónico indicado.
     *
     * @param email correo electrónico a verificar.
     * @return {@code true} si el correo ya está en uso.
     */
    Boolean existsByEmail(String email);

    /**
     * Lista los usuarios que tienen asignado un rol determinado.
     *
     * @param roleName nombre del rol.
     * @return usuarios asociados al rol indicado.
     */
    List<Usuario> findByRole_Name(String roleName);

    /**
     * Lista los usuarios activos del sistema.
     *
     * @return usuarios marcados como activos.
     */
    List<Usuario> findByActiveTrue();

    long countByActiveTrue();

    long countByActiveFalse();
}
