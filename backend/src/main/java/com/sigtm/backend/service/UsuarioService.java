package com.sigtm.backend.service;

import com.sigtm.backend.dto.CrearUsuarioRequest;
import com.sigtm.backend.dto.ActualizarUsuarioRequest;
import com.sigtm.backend.exception.DuplicateResourceException;
import com.sigtm.backend.exception.ResourceNotFoundException;
import com.sigtm.backend.model.Rol;
import com.sigtm.backend.model.Usuario;
import com.sigtm.backend.repository.RolRepository;
import com.sigtm.backend.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Administra las cuentas de usuario del sistema, su perfil, rol y estado.
 *
 * <p>Las contraseñas se almacenan siempre codificadas, y crear un usuario con rol
 * {@code ROLE_ADMIN} está reservado a quien ya sea administrador.</p>
 */
@Service
@RequiredArgsConstructor
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditoriaService auditoriaService;

    /**
     * Registra el inicio de sesión de un usuario y actualiza su último acceso.
     *
     * <p>Deja traza del acceso en la auditoría con la acción {@code LOGIN}.</p>
     *
     * @param userId identificador del usuario que inicia sesión
     * @return la marca de tiempo del acceso en formato ISO 8601
     * @throws ResourceNotFoundException si el usuario no existe
     */
    @Transactional
    public String registrarInicioSesion(Long userId) {
        Usuario usuario = usuarioRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        LocalDateTime now = LocalDateTime.now();
        usuario.setLastLogin(now);
        usuarioRepository.save(usuario);
        auditoriaService.registrar("LOGIN", "USUARIO", userId, "Inicio de sesión de " + usuario.getUsername());
        return now.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
    }

    /**
     * Obtiene el perfil de un usuario con los datos visibles para el frontend.
     *
     * <p>El perfil incluye datos de contacto, el nombre de su rol y las fechas de alta y
     * último acceso, pero nunca expone la contraseña.</p>
     *
     * @param userId identificador del usuario
     * @return los datos del perfil en formato {@code Map}
     * @throws ResourceNotFoundException si el usuario no existe
     */
    @Transactional(readOnly = true)
    public Map<String, Object> obtenerPerfil(Long userId) {
        Usuario usuario = usuarioRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        Map<String, Object> datos = new HashMap<>();
        datos.put("id", usuario.getId());
        datos.put("name", usuario.getName());
        datos.put("lastName", usuario.getLastName());
        datos.put("username", usuario.getUsername());
        datos.put("email", usuario.getEmail());
        datos.put("phone", usuario.getPhone());
        datos.put("avatarUrl", usuario.getAvatarUrl());
        datos.put("active", usuario.getActive());
        datos.put("lastLogin", usuario.getLastLogin() != null ? usuario.getLastLogin().toString() : null);
        datos.put("roleName", usuario.getRole() != null ? usuario.getRole().getName() : null);
        datos.put("createdAt", usuario.getCreatedAt() != null ? usuario.getCreatedAt().toString() : null);
        return datos;
    }

    /**
     * Lista todos los usuarios del sistema con su perfil resumido.
     *
     * <p>El indicador {@code online} se devuelve siempre en {@code false}, ya que el
     * estado en línea aún no se deriva de sesiones activas.</p>
     *
     * @return los perfiles de usuario en formato {@code Map}
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> obtenerTodos() {
        return usuarioRepository.findAll().stream().map(usuario -> {
            Map<String, Object> datos = obtenerPerfil(usuario.getId());
            datos.put("online", false); // Placeholder: el estado en línea se puede derivar de sesiones activas
            return datos;
        }).toList();
    }

    /**
     * Lista los usuarios activos con rol {@code ROLE_MECHANIC}.
     *
     * @return los mecánicos disponibles en formato {@code Map}
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> obtenerMecanicos() {
        return usuarioRepository.findByRole_Name("ROLE_MECHANIC").stream()
                .filter(Usuario::getActive)
                .map(usuario -> {
                    Map<String, Object> datos = new HashMap<>();
                    datos.put("id", usuario.getId());
                    datos.put("name", usuario.getName());
                    datos.put("lastName", usuario.getLastName());
                    datos.put("username", usuario.getUsername());
                    datos.put("phone", usuario.getPhone());
                    return datos;
                }).toList();
    }

    /**
     * Obtiene los códigos de permiso del rol de un usuario.
     *
     * <p>Si el identificador es {@code null} o el usuario no tiene rol, se devuelve una
     * lista vacía.</p>
     *
     * @param userId identificador del usuario
     * @return los códigos de permiso ordenados alfabéticamente
     */
    @Transactional(readOnly = true)
    public List<String> obtenerMisPermisos(Long userId) {
        if (userId == null) return List.of();
        return usuarioRepository.findById(userId)
                .filter(u -> u.getRole() != null)
                .map(u -> u.getRole().getPermissions().stream()
                        .map(p -> p.getCode())
                        .sorted()
                        .toList())
                .orElse(List.of());
    }

    /**
     * Crea una nueva cuenta de usuario.
     *
     * <p>Nombre, apellidos, usuario, correo, rol y contraseña son obligatorios, y la
     * contraseña debe tener al menos 6 caracteres; se almacena codificada. El nombre de
     * usuario y el correo deben ser únicos. Crear un usuario con rol {@code ROLE_ADMIN}
     * queda reservado a quien ya sea administrador. La creación se registra en la
     * auditoría.</p>
     *
     * @param solicitud     datos de la nueva cuenta
     * @param currentUserId identificador del usuario que crea la cuenta; puede ser {@code null}
     * @return el perfil del usuario creado en formato {@code Map}
     * @throws DuplicateResourceException si el nombre de usuario o el correo ya existen
     */
    @Transactional
    public Map<String, Object> crearUsuario(CrearUsuarioRequest solicitud, Long currentUserId) {
        if (solicitud.name() == null || solicitud.name().isBlank()) {
            throw new RuntimeException("El nombre es obligatorio");
        }
        if (solicitud.lastName() == null || solicitud.lastName().isBlank()) {
            throw new RuntimeException("Los apellidos son obligatorios");
        }
        if (solicitud.username() == null || solicitud.username().isBlank()) {
            throw new RuntimeException("El nombre de usuario es obligatorio");
        }
        if (solicitud.email() == null || solicitud.email().isBlank()) {
            throw new RuntimeException("El correo es obligatorio");
        }
        if (solicitud.roleName() == null || solicitud.roleName().isBlank()) {
            throw new RuntimeException("El rol es obligatorio");
        }
        if (solicitud.password() == null || solicitud.password().isBlank()) {
            throw new RuntimeException("La contraseña es obligatoria");
        }
        if (solicitud.password().length() < 12) {
            throw new RuntimeException("La contraseña debe tener al menos 12 caracteres");
        }

        String username = solicitud.username().trim();
        String email = solicitud.email().trim();
        if (Boolean.TRUE.equals(usuarioRepository.existsByUsername(username))) {
            throw new DuplicateResourceException("El nombre de usuario ya existe");
        }
        if (Boolean.TRUE.equals(usuarioRepository.existsByEmail(email))) {
            throw new DuplicateResourceException("El correo ya está registrado por otro usuario");
        }

        Rol rol = rolRepository.findByName(solicitud.roleName())
                .orElseThrow(() -> new RuntimeException("Rol no válido"));

        if ("ROLE_ADMIN".equals(rol.getName())) {
            Usuario creador = currentUserId == null ? null : usuarioRepository.findById(currentUserId).orElse(null);
            String creatorRole = creador != null && creador.getRole() != null ? creador.getRole().getName() : null;
            if (!"ROLE_ADMIN".equals(creatorRole)) {
                throw new RuntimeException("Solo un administrador puede crear usuarios con rol Administrador");
            }
        }

        Usuario usuario = Usuario.builder()
                .name(solicitud.name().trim())
                .lastName(solicitud.lastName().trim())
                .username(username)
                .email(email)
                .phone(solicitud.phone() == null ? null : solicitud.phone().trim())
                .password(passwordEncoder.encode(solicitud.password()))
                .role(rol)
                .active(true)
                .build();

        Usuario guardado = usuarioRepository.save(usuario);
        auditoriaService.registrar("CREATE", "USUARIO", guardado.getId(),
                "Creación del usuario " + guardado.getUsername() + " con rol " + rol.getName());
        return obtenerPerfil(guardado.getId());
    }

    /**
     * Actualiza los datos de una cuenta de usuario.
     *
     * <p>Cada campo se modifica solo si llega informado; el correo debe seguir siendo
     * único y la nueva contraseña, si se indica, debe tener al menos 6 caracteres y se
     * guarda codificada. La operación se registra en la auditoría.</p>
     *
     * @param id            identificador del usuario
     * @param solicitud     datos a actualizar
     * @param currentUserId identificador del usuario que realiza el cambio; puede ser {@code null}
     * @return el perfil actualizado en formato {@code Map}
     * @throws ResourceNotFoundException si el usuario no existe
     * @throws DuplicateResourceException si el correo ya está registrado por otro usuario
     */
    @Transactional
    public Map<String, Object> actualizarUsuario(Long id, ActualizarUsuarioRequest solicitud, Long currentUserId) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));

        if (solicitud.name() != null && !solicitud.name().isBlank()) {
            usuario.setName(solicitud.name().trim());
        }
        if (solicitud.lastName() != null && !solicitud.lastName().isBlank()) {
            usuario.setLastName(solicitud.lastName().trim());
        }
        if (solicitud.email() != null && !solicitud.email().isBlank()) {
            usuarioRepository.findByEmail(solicitud.email().trim())
                    .filter(existente -> !existente.getId().equals(id))
                    .ifPresent(existente -> {
                        throw new com.sigtm.backend.exception.DuplicateResourceException("El correo ya está registrado por otro usuario");
                    });
            usuario.setEmail(solicitud.email().trim());
        }
        if (solicitud.phone() != null) {
            usuario.setPhone(solicitud.phone().trim());
        }
        if (solicitud.roleName() != null && !solicitud.roleName().isBlank()) {
            Rol rol = rolRepository.findByName(solicitud.roleName())
                    .orElseThrow(() -> new RuntimeException("Rol no válido"));
            usuario.setRole(rol);
        }
        if (solicitud.newPassword() != null && !solicitud.newPassword().isBlank()) {
            if (solicitud.newPassword().length() < 12) {
                throw new RuntimeException("La contraseña debe tener al menos 12 caracteres");
            }
            usuario.setPassword(passwordEncoder.encode(solicitud.newPassword()));
            usuario.setTokenVersion(usuario.getTokenVersion() + 1);
        }

        Usuario guardado = usuarioRepository.save(usuario);
        auditoriaService.registrar("UPDATE", "USUARIO", guardado.getId(), "Actualización del usuario " + guardado.getUsername());
        return obtenerPerfil(guardado.getId());
    }

    /**
     * Activa o desactiva una cuenta de usuario.
     *
     * <p>Nadie puede desactivar su propia cuenta. El cambio de estado se registra en la
     * auditoría con la acción {@code STATUS}.</p>
     *
     * @param id            identificador del usuario
     * @param active        {@code true} para activar, {@code false} para desactivar
     * @param currentUserId identificador del usuario que realiza el cambio; puede ser {@code null}
     * @return el perfil actualizado en formato {@code Map}
     * @throws ResourceNotFoundException si el usuario no existe
     */
    @Transactional
    public Map<String, Object> setActive(Long id, boolean active, Long currentUserId) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));

        if (!active && id.equals(currentUserId)) {
            throw new RuntimeException("No puedes desactivar tu propia cuenta");
        }

        usuario.setActive(active);
        if (!active) {
            usuario.setTokenVersion(usuario.getTokenVersion() + 1);
        }
        Usuario guardado = usuarioRepository.save(usuario);
        auditoriaService.registrar("STATUS", "USUARIO", guardado.getId(),
                (active ? "Activación" : "Desactivación") + " del usuario " + guardado.getUsername());
        return obtenerPerfil(guardado.getId());
    }
}
