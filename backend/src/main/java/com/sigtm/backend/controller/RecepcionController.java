package com.sigtm.backend.controller;

import com.sigtm.backend.dto.CrearRecepcionRequest;
import com.sigtm.backend.dto.RecepcionResponse;
import com.sigtm.backend.model.Usuario;
import com.sigtm.backend.model.OrdenTrabajo;
import com.sigtm.backend.repository.UsuarioRepository;
import com.sigtm.backend.security.services.UserDetailsImpl;
import com.sigtm.backend.service.RecepcionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/**
 * Endpoints de recepción de vehículos.
 *
 * <p>El acceso se controla con los permisos del módulo {@code RECEPCION}
 * ({@code RECEPCION:VER} y {@code RECEPCION:CREAR}). El mecánico también puede
 * consultar el detalle y las recepciones de un vehículo desde su pantalla de
 * trabajo con {@code MI_TRABAJO:VER}.</p>
 */
@RestController
@RequestMapping("/api/recepciones")
@RequiredArgsConstructor
public class RecepcionController {

    private static final int MAX_PHOTOS_PER_RECEPTION = 10;

    private final RecepcionService recepcionService;
    private final UsuarioRepository usuarioRepository;

    private Long idUsuarioActual() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserDetailsImpl user) {
            return user.getId();
        }
        return null;
    }

    // Acceso por permiso del módulo RECEPCION. El mecánico accede al detalle de una
    // recepción desde "Mi trabajo" (MI_TRABAJO:VER), sin tener el módulo Recepciones.
    /**
     * Lista todas las recepciones registradas.
     *
     * <p>Exige {@code RECEPCION:VER}.</p>
     *
     * @return la lista de recepciones (200)
     */
    @GetMapping
    @PreAuthorize("hasAuthority('RECEPCION:VER')")
    public ResponseEntity<List<RecepcionResponse>> obtenerTodas() {
        return ResponseEntity.ok(recepcionService.obtenerTodas());
    }

    /**
     * Devuelve el detalle de una recepción.
     *
     * <p>Exige {@code RECEPCION:VER} o {@code MI_TRABAJO:VER}. Un identificador
     * inexistente produce 400 con el mensaje de recurso no encontrado.</p>
     *
     * @param id identificador de la recepción
     * @return la recepción solicitada (200)
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('RECEPCION:VER', 'MI_TRABAJO:VER')")
    public ResponseEntity<RecepcionResponse> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(recepcionService.obtenerPorId(id));
    }

    /**
     * Lista las recepciones de un vehículo.
     *
     * <p>Exige {@code RECEPCION:VER} o {@code MI_TRABAJO:VER}.</p>
     *
     * @param vehicleId identificador del vehículo
     * @return la lista de recepciones del vehículo (200)
     */
    @GetMapping("/vehiculo/{vehicleId}")
    @PreAuthorize("hasAnyAuthority('RECEPCION:VER', 'MI_TRABAJO:VER')")
    public ResponseEntity<List<RecepcionResponse>> obtenerPorVehiculo(@PathVariable Long vehicleId) {
        return ResponseEntity.ok(recepcionService.obtenerPorVehiculo(vehicleId));
    }

    /**
     * Registra la recepción de un vehículo.
     *
     * <p>Exige {@code RECEPCION:CREAR}. Consume {@code multipart/form-data}: el
     * formulario viaja en la parte {@code data} y las fotos son opcionales. El
     * vehículo indicado en los datos debe existir, o la operación falla con 400.</p>
     *
     * @param data   datos de la recepción (cliente, vehículo, servicios, etc.)
     * @param photos fotos del estado del vehículo; opcional
     * @return la recepción creada, ya consultada por su identificador (201)
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('RECEPCION:CREAR')")
    public ResponseEntity<?> crearRecepcion(
            @RequestPart("data") CrearRecepcionRequest data,
            @RequestPart(value = "photos", required = false) List<MultipartFile> photos) {
        if (photos != null && photos.size() > MAX_PHOTOS_PER_RECEPTION) {
            throw new IllegalArgumentException("Se permiten como máximo 10 fotografías por recepción");
        }
        var guardada = recepcionService.crearRecepcion(data, photos, idUsuarioActual());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(recepcionService.obtenerPorId(guardada.getId()));
    }

    /**
     * Emite la orden de trabajo a partir de una recepción.
     *
     * <p>Exige {@code RECEPCION:CREAR}. La recepción debe existir; la orden nace
     * con su número correlativo y queda enlazada al cliente y al vehículo.</p>
     *
     * @param id identificador de la recepción de origen
     * @return un mapa con el mensaje de confirmación y los datos de la orden emitida (200)
     */
    @PostMapping("/{id}/emitir-orden")
    @PreAuthorize("hasAuthority('RECEPCION:CREAR')")
    public ResponseEntity<Map<String, Object>> emitirOrden(@PathVariable Long id) {
        OrdenTrabajo ordenTrabajo = recepcionService.emitirOrdenTrabajo(id);
        return ResponseEntity.ok(Map.of(
                "message", "Orden de trabajo emitida correctamente.",
                "workOrderId", ordenTrabajo.getId(),
                "orderNumber", ordenTrabajo.getOrderNumber()));
    }
}
