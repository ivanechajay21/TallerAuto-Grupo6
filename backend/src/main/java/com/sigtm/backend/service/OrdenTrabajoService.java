package com.sigtm.backend.service;

import com.sigtm.backend.dto.AjusteStockRequest;
import com.sigtm.backend.dto.ActualizarOrdenTrabajoRequest;
import com.sigtm.backend.exception.ResourceNotFoundException;
import com.sigtm.backend.model.*;
import com.sigtm.backend.repository.*;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.JpaSort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Administra las órdenes de trabajo y sus ítems (servicios y repuestos).
 *
 * <p>La orden se crea con número correlativo {@code OT-000001} y estado {@code RECIBIDO},
 * descuenta el stock de los repuestos al agregar ítems y lo devuelve al eliminarlos.
 * Los hitos relevantes notifican a los roles de gerencia, recepción y administración, y
 * todo cambio queda registrado en la auditoría.</p>
 */
@Service
@RequiredArgsConstructor
public class OrdenTrabajoService {

    private final OrdenTrabajoRepository ordenTrabajoRepository;
    private final ClienteRepository clienteRepository;
    private final VehiculoRepository vehiculoRepository;
    private final CitaRepository citaRepository;
    private final ItemOrdenTrabajoRepository itemOrdenTrabajoRepository;
    private final ServicioCatalogoRepository servicioCatalogoRepository;
    private final UsuarioRepository usuarioRepository;
    private final CodeGeneratorService codeGeneratorService;
    private final NotificacionService notificacionService;
    private final AuditoriaService auditoriaService;
    private final ProductoService productoService;

    /**
     * Lista todas las órdenes de trabajo con sus ítems y el total calculado.
     *
     * <p>El importe total se obtiene sumando el precio por la cantidad de cada ítem.</p>
     *
     * @return la colección de órdenes en formato {@code Map}
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> obtenerTodas() {
        return ordenTrabajoRepository.findAll().stream().map(this::aRespuesta).toList();
    }

    /**
     * Consulta paginada del tablero, con filtros y ordenamiento en servidor.
     *
     * <p>El tablero activo excluye las órdenes finalizadas; el historial las
     * incluye exclusivamente. Los filtros por mecánico, sin mecánico o sin ítems
     * se resuelven con subconsultas para no duplicar órdenes.</p>
     *
     * @param page             página solicitada, base cero
     * @param size             tamaño de página, limitado a 100
     * @param tab              {@code activas} o {@code historial}
     * @param search           texto libre por OT, cliente, vehículo o mecánico
     * @param status           estado exacto; {@code TODAS} o vacío lo omiten
     * @param priority         prioridad exacta; {@code TODAS} o vacío la omiten
     * @param mechanicId       mecánico asignado a algún ítem
     * @param onlyUrgent       solo prioridad urgente
     * @param onlyUnassigned   solo órdenes sin mecánico
     * @param onlyNoItems      solo órdenes sin ítems
     * @param onlyStale        solo órdenes con 7 días o más en taller
     * @param sort             prioridad, antigua, reciente o total
     * @return página de órdenes y resumen global de indicadores
     */
    @Transactional(readOnly = true)
    public Map<String, Object> buscarPaginado(
            int page,
            int size,
            String tab,
            String search,
            String status,
            String priority,
            Long mechanicId,
            boolean onlyUrgent,
            boolean onlyUnassigned,
            boolean onlyNoItems,
            boolean onlyStale,
            String sort
    ) {
        int pageIndex = Math.max(0, page);
        int pageSize = Math.min(100, Math.max(1, size));
        String tabSeguro = "historial".equalsIgnoreCase(tab) ? "historial" : "activas";
        String texto = search == null ? null : search.trim().toLowerCase(Locale.ROOT);

        Specification<OrdenTrabajo> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(tabSeguro.equals("historial")
                    ? cb.equal(root.get("status"), "FINALIZADO")
                    : cb.notEqual(root.get("status"), "FINALIZADO"));

            if (status != null && !status.isBlank() && !"TODAS".equalsIgnoreCase(status)) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (priority != null && !priority.isBlank() && !"TODAS".equalsIgnoreCase(priority)) {
                predicates.add(cb.equal(cb.upper(root.get("priority")), priority.toUpperCase(Locale.ROOT)));
            }
            if (texto != null && !texto.isBlank()) {
                Join<OrdenTrabajo, Cliente> cliente = root.join("customer", JoinType.LEFT);
                Join<OrdenTrabajo, Vehiculo> vehiculo = root.join("vehicle", JoinType.LEFT);
                String like = "%" + texto + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("orderNumber")), like),
                        cb.like(cb.lower(cliente.get("firstName")), like),
                        cb.like(cb.lower(cliente.get("lastName")), like),
                        cb.like(cb.lower(cliente.get("documentNumber")), like),
                        cb.like(cb.lower(vehiculo.get("plate")), like),
                        cb.like(cb.lower(vehiculo.get("brand")), like),
                        cb.like(cb.lower(vehiculo.get("model")), like)
                ));
            }
            if (onlyUrgent) {
                predicates.add(cb.equal(cb.upper(root.get("priority")), "URGENTE"));
            }
            if (mechanicId != null) {
                Subquery<Long> asignadas = query.subquery(Long.class);
                Root<ItemOrdenTrabajo> item = asignadas.from(ItemOrdenTrabajo.class);
                asignadas.select(item.get("id")).where(
                        cb.equal(item.get("workOrder"), root),
                        cb.equal(item.get("mechanic").get("id"), mechanicId)
                );
                predicates.add(cb.exists(asignadas));
            }
            if (onlyUnassigned) {
                Subquery<Long> asignadas = query.subquery(Long.class);
                Root<ItemOrdenTrabajo> item = asignadas.from(ItemOrdenTrabajo.class);
                asignadas.select(item.get("id")).where(
                        cb.equal(item.get("workOrder"), root),
                        cb.isNotNull(item.get("mechanic"))
                );
                predicates.add(cb.not(cb.exists(asignadas)));
            }
            if (onlyNoItems) {
                Subquery<Long> items = query.subquery(Long.class);
                Root<ItemOrdenTrabajo> item = items.from(ItemOrdenTrabajo.class);
                items.select(item.get("id")).where(cb.equal(item.get("workOrder"), root));
                predicates.add(cb.not(cb.exists(items)));
            }
            if (onlyStale) {
                predicates.add(cb.lessThanOrEqualTo(
                        root.get("receptionDate"), LocalDateTime.now().minusDays(7)));
            }
            query.distinct(true);
            return cb.and(predicates.toArray(Predicate[]::new));
        };

        String ordenSolicitado = sort == null ? "prioridad" : sort.toLowerCase(Locale.ROOT);
        Page<OrdenTrabajo> resultado;
        if ("total".equals(ordenSolicitado)) {
            List<OrdenTrabajo> todos = new ArrayList<>(ordenTrabajoRepository.findAll(spec));
            todos.sort(Comparator.comparing(this::calcularTotal).reversed());
            int desde = Math.min(pageIndex * pageSize, todos.size());
            int hasta = Math.min(desde + pageSize, todos.size());
            resultado = new PageImpl<>(todos.subList(desde, hasta), PageRequest.of(pageIndex, pageSize), todos.size());
        } else {
            Sort orden = switch (ordenSolicitado) {
                case "antigua" -> Sort.by(Sort.Direction.ASC, "receptionDate");
                case "reciente" -> Sort.by(Sort.Direction.DESC, "receptionDate");
                default -> JpaSort.unsafe(
                                "CASE WHEN priority = 'URGENTE' THEN 0 WHEN priority = 'ALTA' THEN 1 ELSE 2 END")
                        .ascending()
                        .and(Sort.by(Sort.Direction.ASC, "receptionDate"));
            };
            resultado = ordenTrabajoRepository.findAll(
                    spec, PageRequest.of(pageIndex, pageSize, orden));
        }

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("content", resultado.getContent().stream().map(this::aRespuesta).toList());
        respuesta.put("page", resultado.getNumber() + 1);
        respuesta.put("size", resultado.getSize());
        respuesta.put("totalElements", resultado.getTotalElements());
        respuesta.put("totalPages", resultado.getTotalPages());
        respuesta.put("summary", resumen());
        return respuesta;
    }

    private Map<String, Object> resumen() {
        long total = ordenTrabajoRepository.count();
        long history = ordenTrabajoRepository.countByStatus("FINALIZADO");
        long active = ordenTrabajoRepository.countByStatusNot("FINALIZADO");
        BigDecimal valor = itemOrdenTrabajoRepository.sumarValorActivo();

        Map<String, Object> resumen = new LinkedHashMap<>();
        resumen.put("total", total);
        resumen.put("active", active);
        resumen.put("history", history);
        resumen.put("urgent", ordenTrabajoRepository.countByStatusNotAndPriorityIgnoreCase("FINALIZADO", "URGENTE"));
        resumen.put("ready", ordenTrabajoRepository.countByStatus("LISTO_PARA_ENTREGA"));
        resumen.put("estimatedValue", valor == null ? BigDecimal.ZERO : valor);
        return resumen;
    }

    private BigDecimal calcularTotal(OrdenTrabajo orden) {
        return (orden.getItems() == null ? List.<ItemOrdenTrabajo>of() : orden.getItems()).stream()
                .map(item -> item.getPrice() != null
                        ? item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity() != null ? item.getQuantity() : 1))
                        : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Obtiene una orden de trabajo con el detalle de sus ítems.
     *
     * @param id identificador de la orden
     * @return la orden solicitada en formato {@code Map}
     * @throws ResourceNotFoundException si la orden no existe
     */
    @Transactional(readOnly = true)
    public Map<String, Object> obtenerPorId(Long id) {
        return aRespuesta(obtenerEntidadPorId(id));
    }

    /**
     * Comprueba si un mecánico tiene algún trabajo asignado dentro de una orden.
     *
     * <p>Sirve para aplicar autorización a nivel de recurso cuando el usuario
     * únicamente tiene el permiso {@code MI_TRABAJO:VER}.</p>
     *
     * @param orderId   identificador de la orden
     * @param mechanicId identificador del mecánico
     * @return {@code true} si la orden contiene al menos un ítem asignado al mecánico
     */
    @Transactional(readOnly = true)
    public boolean puedeVerOrden(Long orderId, Long mechanicId) {
        return orderId != null && mechanicId != null
                && itemOrdenTrabajoRepository.existsByWorkOrderIdAndMechanicId(orderId, mechanicId);
    }

    /**
     * Lista las órdenes de trabajo que se encuentran en un estado concreto.
     *
     * @param status estado por el que filtrar
     * @return las órdenes en ese estado en formato {@code Map}
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> obtenerPorEstado(String status) {
        return ordenTrabajoRepository.findByStatus(status).stream().map(this::aRespuesta).toList();
    }

    /** Normaliza la prioridad (p. ej. "Normal" -> "NORMAL") y evita valores inválidos. */
    private String normalizarPrioridad(String priority) {
        if (priority == null || priority.isBlank()) return "NORMAL";
        return priority.trim().toUpperCase(java.util.Locale.ROOT);
    }

    /**
     * Registra una nueva orden de trabajo para un cliente y su vehículo.
     *
     * <p>Si se indica una cita, la orden queda vinculada a ella y la cita pasa a estado
     * {@code IN_PROCESS}. La orden recibe el número correlativo {@code OT-000001}, el
     * estado inicial {@code RECIBIDO} y una prioridad normalizada. Se notifica a los
     * roles de gerencia, administración y recepción, y se deja traza en la auditoría. Si
     * el cliente, el vehículo o la cita no existen se lanza
     * {@code ResourceNotFoundException}.</p>
     *
     * @param customerId    identificador del cliente
     * @param vehicleId     identificador del vehículo
     * @param appointmentId identificador de la cita de origen; puede ser {@code null}
     * @param workOrder     datos de la orden a registrar
     * @return la orden creada en formato {@code Map}
     * @throws ResourceNotFoundException si el cliente, el vehículo o la cita no existen
     */
    @Transactional
    public Map<String, Object> crearOrdenTrabajo(Long customerId, Long vehicleId, Long appointmentId, OrdenTrabajo workOrder) {
        Cliente customer = clienteRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado"));
        Vehiculo vehicle = vehiculoRepository.findById(vehicleId)
                .orElseThrow(() -> new ResourceNotFoundException("Vehículo no encontrado"));

        workOrder.setCustomer(customer);
        workOrder.setVehicle(vehicle);

        if (appointmentId != null) {
            Cita cita = citaRepository.findById(appointmentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Cita no encontrada"));
            workOrder.setAppointment(cita);
            // Update cita status automatically when a work order is created
            cita.setStatus("IN_PROCESS");
            citaRepository.save(cita);
        }

        // Generate a unique, sequential order number (OT-000001)
        workOrder.setOrderNumber(codeGeneratorService.nextCode("OT"));
        workOrder.setStatus("RECIBIDO");
        workOrder.setPriority(normalizarPrioridad(workOrder.getPriority()));

        OrdenTrabajo guardada = ordenTrabajoRepository.save(workOrder);

        notificacionService.notificarRol(
                List.of("ROLE_MANAGER", "ROLE_ADMIN", "ROLE_RECEPTIONIST"),
                "ORDENES",
                "Nueva orden de trabajo",
                "Se registró la orden " + guardada.getOrderNumber() + " para el vehículo " + vehicle.getPlate(),
                "/ordenes-trabajo");

        auditoriaService.registrar("CREATE", "ORDEN_TRABAJO", guardada.getId(),
                "Registro de la orden " + guardada.getOrderNumber() + " para el vehículo " + vehicle.getPlate());

        return aRespuesta(guardada);
    }

    /**
     * Actualiza los campos descriptivos de una orden de trabajo.
     *
     * <p>Solo se sobrescriben los campos informados en la petición; la prioridad se
     * normaliza a mayúsculas. El cambio se registra en la auditoría.</p>
     *
     * @param id      identificador de la orden
     * @param request campos a actualizar
     * @return la orden actualizada en formato {@code Map}
     * @throws ResourceNotFoundException si la orden no existe
     */
    @Transactional
    public Map<String, Object> actualizarCamposOrden(Long id, ActualizarOrdenTrabajoRequest request) {
        OrdenTrabajo workOrder = obtenerEntidadPorId(id);

        if (request.currentMileage() != null) workOrder.setCurrentMileage(request.currentMileage());
        if (request.fuelLevel() != null) workOrder.setFuelLevel(request.fuelLevel());
        if (request.customerSymptoms() != null) workOrder.setCustomerSymptoms(request.customerSymptoms());
        if (request.technicalDiagnosis() != null) workOrder.setTechnicalDiagnosis(request.technicalDiagnosis());
        if (request.priority() != null) workOrder.setPriority(normalizarPrioridad(request.priority()));
        if (request.visualDamages() != null) workOrder.setVisualDamages(request.visualDamages());

        OrdenTrabajo guardada = ordenTrabajoRepository.save(workOrder);
        auditoriaService.registrar("UPDATE", "ORDEN_TRABAJO", guardada.getId(),
                "Actualización de datos de la orden " + guardada.getOrderNumber());
        return aRespuesta(guardada);
    }

    /**
     * Cambia el estado de una orden de trabajo.
     *
     * <p>El cambio se registra en la auditoría con la acción {@code STATUS}; si el nuevo
     * estado es {@code FINALIZADO} o {@code LISTO_PARA_ENTREGA} se notifica a los roles
     * de recepción, gerencia y administración. Si la orden no existe se lanza
     * {@code ResourceNotFoundException}.</p>
     *
     * @param id     identificador de la orden
     * @param status nuevo estado de la orden
     * @return la orden actualizada en formato {@code Map}
     * @throws ResourceNotFoundException si la orden no existe
     */
    @Transactional
    public Map<String, Object> actualizarEstado(Long id, String status) {
        OrdenTrabajo workOrder = obtenerEntidadPorId(id);
        String anterior = workOrder.getStatus();
        workOrder.setStatus(status);
        OrdenTrabajo guardada = ordenTrabajoRepository.save(workOrder);

        auditoriaService.registrar("STATUS", "ORDEN_TRABAJO", guardada.getId(),
                "Orden " + guardada.getOrderNumber() + " pasó de " + anterior + " a " + status);

        if ("FINALIZADO".equals(status) || "LISTO_PARA_ENTREGA".equals(status)) {
            notificacionService.notificarRol(
                    List.of("ROLE_RECEPTIONIST", "ROLE_MANAGER", "ROLE_ADMIN"),
                    "ORDENES",
                    "Vehículo listo",
                    "La orden " + guardada.getOrderNumber() + " quedó en estado '" + status + "'. Vehículo listo para entrega.",
                    "/ordenes-trabajo");
        }

        return aRespuesta(guardada);
    }

    /**
     * Agrega un ítem (servicio o repuesto) a una orden de trabajo.
     *
     * <p>Debe indicarse un servicio o un producto, nunca ambos, y la cantidad debe ser
     * mayor que cero. Si es un repuesto se descuenta su stock y, si tiene mecánico
     * asignado, se le notifica. El ítem nace en estado {@code PENDING} y todo queda
     * registrado en la auditoría. Los errores de stock, la inactividad del producto o la
     * no existencia de la orden, el servicio o el mecánico interrumpen la transacción.</p>
     *
     * @param workOrderId      identificador de la orden
     * @param serviceCatalogId identificador del servicio del catálogo; puede ser {@code null}
     * @param productId        identificador del repuesto; puede ser {@code null}
     * @param mechanicId       identificador del mecánico asignado; puede ser {@code null}
     * @param item             datos del ítem a agregar
     * @return el ítem creado en formato {@code Map}
     * @throws IllegalArgumentException si se envían servicio y producto a la vez, la cantidad
     *                                  no es válida o el producto está inactivo
     * @throws ResourceNotFoundException si la orden, el servicio o el mecánico no existen
     */
    @Transactional
    public Map<String, Object> agregarItem(Long workOrderId, Long serviceCatalogId, Long productId,
            Long mechanicId, ItemOrdenTrabajo item) {
        OrdenTrabajo workOrder = obtenerEntidadPorId(workOrderId);

        if (serviceCatalogId != null && productId != null) {
            throw new IllegalArgumentException("Selecciona un servicio o un producto, no ambos");
        }
        if (item.getQuantity() == null || item.getQuantity() < 1) {
            throw new IllegalArgumentException("La cantidad debe ser mayor a 0");
        }

        ServicioCatalogo servicio = null;
        if (serviceCatalogId != null) {
            servicio = servicioCatalogoRepository.findById(serviceCatalogId)
                    .orElseThrow(() -> new ResourceNotFoundException("Servicio no encontrado"));
            item.setPrice(servicio.getDefaultPrice()); // Default price if not overridden
        }

        Producto product = null;
        if (productId != null) {
            product = productoService.obtenerPorId(productId);
            if (!Boolean.TRUE.equals(product.getActive())) {
                throw new IllegalArgumentException("El producto «" + product.getName() + "» está inactivo");
            }
            if (item.getPrice() == null) {
                item.setPrice(product.getSalePrice()); // Precio por defecto = precio de venta
            }
        }
        if (item.getPrice() == null) {
            item.setPrice(BigDecimal.ZERO);
        }

        Usuario mechanic = null;
        if (mechanicId != null) {
            mechanic = usuarioRepository.findById(mechanicId)
                    .orElseThrow(() -> new ResourceNotFoundException("Mecánico no encontrado"));
        }

        // Descontar stock ANTES de guardar; si algo falla la transacción revierte ambas operaciones.
        if (product != null) {
            productoService.aplicarCambioStock(product.getId(),
                    new AjusteStockRequest(item.getQuantity(), "OUT", "OT-" + workOrder.getOrderNumber()));
        }

        item.setWorkOrder(workOrder);
        item.setServiceCatalog(servicio);
        item.setProduct(product);
        item.setMechanic(mechanic);
        item.setStatus("PENDING");

        ItemOrdenTrabajo guardada = itemOrdenTrabajoRepository.save(item);

        if (mechanic != null) {
            notificacionService.crear(
                    mechanic.getId(),
                    "ORDENES",
                    "Trabajo asignado",
                    "Se te asignó el trabajo '" + item.getDescription() + "' de la orden " + workOrder.getOrderNumber(),
                    "/mi-trabajo");
        }

        auditoriaService.registrar("CREATE", "ITEM_ORDEN", guardada.getId(),
                "Item agregado a la orden " + workOrder.getOrderNumber() + ": " + guardada.getDescription()
                        + " (cant. " + guardada.getQuantity() + ", S/ " + guardada.getPrice() + ")");

        return aRespuestaItem(guardada);
    }

    /**
     * Actualiza un ítem existente de una orden de trabajo.
     *
     * <p>Debe indicarse un servicio o un producto, nunca ambos, y la cantidad resultante
     * debe ser mayor que cero. El stock del inventario se reajusta según el cambio de
     * producto o cantidad, revirtiéndose por completo si algo falla. El cambio se
     * registra en la auditoría.</p>
     *
     * @param itemId           identificador del ítem
     * @param serviceCatalogId identificador del servicio del catálogo; puede ser {@code null}
     * @param productId        identificador del repuesto; puede ser {@code null}
     * @param mechanicId       identificador del mecánico asignado; puede ser {@code null}
     * @param item             nuevos datos del ítem
     * @return el ítem actualizado en formato {@code Map}
     * @throws IllegalArgumentException si se envían servicio y producto a la vez, la cantidad
     *                                  no es válida o el producto está inactivo
     * @throws ResourceNotFoundException si el ítem, el servicio o el mecánico no existen
     */
    @Transactional
    public Map<String, Object> actualizarItem(Long itemId, Long serviceCatalogId, Long productId,
            Long mechanicId, ItemOrdenTrabajo item) {
        ItemOrdenTrabajo existente = itemOrdenTrabajoRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Item no encontrado"));

        if (serviceCatalogId != null && productId != null) {
            throw new IllegalArgumentException("Selecciona un servicio o un producto, no ambos");
        }

        Producto nuevoProducto = null;
        if (productId != null) {
            nuevoProducto = productoService.obtenerPorId(productId);
            if (!Boolean.TRUE.equals(nuevoProducto.getActive())) {
                throw new IllegalArgumentException("El producto «" + nuevoProducto.getName() + "» está inactivo");
            }
        }

        int cantidadAnterior = existente.getQuantity() != null ? existente.getQuantity() : 1;
        int nuevaCantidad = item.getQuantity() != null ? item.getQuantity() : cantidadAnterior;
        if (nuevaCantidad < 1) {
            throw new IllegalArgumentException("La cantidad debe ser mayor a 0");
        }

        // Ajustar stock según el cambio de producto/cantidad (se revierte todo si algo falla).
        Producto productoAnterior = existente.getProduct();
        Long idProductoAnterior = productoAnterior != null ? productoAnterior.getId() : null;
        Long idNuevoProducto = nuevoProducto != null ? nuevoProducto.getId() : null;
        String referencia = "OT-" + (existente.getWorkOrder() != null ? existente.getWorkOrder().getOrderNumber() : "?");

        if (idProductoAnterior != null && !idProductoAnterior.equals(idNuevoProducto)) {
            // Se retiró el producto anterior: devolver su stock.
            productoService.aplicarCambioStock(idProductoAnterior, new AjusteStockRequest(cantidadAnterior, "IN", referencia));
        }
        if (nuevoProducto != null) {
            int delta = nuevaCantidad - (idProductoAnterior != null && idProductoAnterior.equals(idNuevoProducto) ? cantidadAnterior : 0);
            if (delta > 0) {
                productoService.aplicarCambioStock(idNuevoProducto, new AjusteStockRequest(delta, "OUT", referencia));
            } else if (delta < 0) {
                productoService.aplicarCambioStock(idNuevoProducto, new AjusteStockRequest(-delta, "IN", referencia));
            }
        }

        if (item.getDescription() != null && !item.getDescription().isBlank()) {
            existente.setDescription(item.getDescription());
        }
        if (nuevoProducto != null) {
            existente.setPrice(item.getPrice() != null ? item.getPrice() : nuevoProducto.getSalePrice());
        } else if (item.getPrice() != null) {
            existente.setPrice(item.getPrice());
        }
        existente.setQuantity(nuevaCantidad);
        if (item.getObservations() != null) {
            existente.setObservations(item.getObservations());
        }

        ServicioCatalogo servicio = null;
        if (serviceCatalogId != null) {
            servicio = servicioCatalogoRepository.findById(serviceCatalogId)
                    .orElseThrow(() -> new ResourceNotFoundException("Servicio no encontrado"));
            existente.setPrice(servicio.getDefaultPrice());
        }
        existente.setServiceCatalog(servicio);
        existente.setProduct(nuevoProducto);

        Usuario mechanic = null;
        if (mechanicId != null) {
            mechanic = usuarioRepository.findById(mechanicId)
                    .orElseThrow(() -> new ResourceNotFoundException("Mecánico no encontrado"));
        }
        existente.setMechanic(mechanic);

        ItemOrdenTrabajo guardada = itemOrdenTrabajoRepository.save(existente);
        auditoriaService.registrar("UPDATE", "ITEM_ORDEN", guardada.getId(),
                "Item de la orden " + (guardada.getWorkOrder() != null ? guardada.getWorkOrder().getOrderNumber() : "?")
                        + " actualizado: " + guardada.getDescription());
        return aRespuestaItem(guardada);
    }

    /**
     * Elimina un ítem de una orden de trabajo.
     *
     * <p>Si el ítem es un repuesto, su cantidad se devuelve al inventario. La baja se
     * registra en la auditoría con la acción {@code DELETE}.</p>
     *
     * @param itemId identificador del ítem
     * @throws ResourceNotFoundException si el ítem no existe
     */
    @Transactional
    public void eliminarItem(Long itemId) {
        ItemOrdenTrabajo item = itemOrdenTrabajoRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Item no encontrado"));
        String orderNumber = item.getWorkOrder() != null ? item.getWorkOrder().getOrderNumber() : "?";

        // Devolver el stock del repuesto al inventario.
        if (item.getProduct() != null) {
            int qty = item.getQuantity() != null ? item.getQuantity() : 0;
            if (qty > 0) {
                productoService.aplicarCambioStock(item.getProduct().getId(),
                        new AjusteStockRequest(qty, "IN", "OT-" + orderNumber));
            }
        }

        itemOrdenTrabajoRepository.delete(item);
        auditoriaService.registrar("DELETE", "ITEM_ORDEN", itemId,
                "Item eliminado de la orden " + orderNumber + ": " + item.getDescription());
    }

    /**
     * Cambia el estado de un ítem de una orden de trabajo.
     *
     * <p>Al pasar a {@code IN_PROGRESS} se fija la fecha de inicio si aún no la tenía, y
     * al pasar a {@code COMPLETED} se fija la fecha de fin. El cambio se registra en la
     * auditoría.</p>
     *
     * @param itemId identificador del ítem
     * @param status nuevo estado del ítem
     * @return el ítem actualizado en formato {@code Map}
     * @throws ResourceNotFoundException si el ítem no existe
     */
    @Transactional
    public Map<String, Object> actualizarEstadoItem(Long itemId, String status) {
        ItemOrdenTrabajo item = itemOrdenTrabajoRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Item no encontrado"));
        item.setStatus(status);

        if ("IN_PROGRESS".equals(status) && item.getStartDate() == null) {
            item.setStartDate(LocalDateTime.now());
        } else if ("COMPLETED".equals(status)) {
            item.setEndDate(LocalDateTime.now());
        }

        ItemOrdenTrabajo guardada = itemOrdenTrabajoRepository.save(item);
        auditoriaService.registrar("STATUS", "ITEM_ORDEN", guardada.getId(),
                "Item '" + guardada.getDescription() + "' de la orden "
                        + (guardada.getWorkOrder() != null ? guardada.getWorkOrder().getOrderNumber() : "?")
                        + " cambió a " + status);
        return aRespuestaItem(guardada);
    }

    /**
     * Lista los ítems de trabajo asignados a un mecánico.
     *
     * @param mechanicId identificador del mecánico
     * @return los ítems asignados en formato {@code Map}
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> obtenerMisTrabajos(Long mechanicId) {
        return itemOrdenTrabajoRepository.findByMechanicId(mechanicId).stream()
                .map(this::aRespuestaItem).toList();
    }

    private OrdenTrabajo obtenerEntidadPorId(Long id) {
        return ordenTrabajoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Orden de trabajo no encontrada"));
    }

    private Map<String, Object> aRespuesta(OrdenTrabajo o) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", o.getId());
        m.put("orderNumber", o.getOrderNumber());
        m.put("receptionDate", o.getReceptionDate() != null ? o.getReceptionDate().toString() : null);
        m.put("currentMileage", o.getCurrentMileage());
        m.put("fuelLevel", o.getFuelLevel());
        m.put("customerSymptoms", o.getCustomerSymptoms());
        m.put("technicalDiagnosis", o.getTechnicalDiagnosis());
        m.put("priority", o.getPriority());
        m.put("status", o.getStatus());
        m.put("visualDamages", o.getVisualDamages());

        if (o.getCustomer() != null) {
            Cliente c = o.getCustomer();
            Map<String, Object> cust = new LinkedHashMap<>();
            cust.put("id", c.getId());
            cust.put("code", c.getCode());
            cust.put("firstName", c.getFirstName());
            cust.put("lastName", c.getLastName());
            cust.put("documentNumber", c.getDocumentNumber());
            cust.put("phone", c.getPhone());
            m.put("customer", cust);
        }

        if (o.getVehicle() != null) {
            Vehiculo v = o.getVehicle();
            Map<String, Object> veh = new LinkedHashMap<>();
            veh.put("id", v.getId());
            veh.put("code", v.getCode());
            veh.put("plate", v.getPlate());
            veh.put("brand", v.getBrand());
            veh.put("model", v.getModel());
            veh.put("year", v.getYear());
            veh.put("color", v.getColor());
            m.put("vehicle", veh);
        }

        if (o.getAppointment() != null) {
            m.put("appointmentId", o.getAppointment().getId());
        }

        List<ItemOrdenTrabajo> itemsOrden = o.getItems() != null ? o.getItems() : List.of();
        List<Map<String, Object>> items = itemsOrden.stream().map(this::aRespuestaItem).toList();
        m.put("items", items);

        BigDecimal total = itemsOrden.stream()
                .map(i -> i.getPrice() != null
                        ? i.getPrice().multiply(BigDecimal.valueOf(i.getQuantity() != null ? i.getQuantity() : 1))
                        : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        m.put("totalAmount", total);

        return m;
    }

    private Map<String, Object> aRespuestaItem(ItemOrdenTrabajo it) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", it.getId());
        m.put("description", it.getDescription());
        m.put("price", it.getPrice());
        m.put("quantity", it.getQuantity());
        m.put("status", it.getStatus());
        m.put("startDate", it.getStartDate() != null ? it.getStartDate().toString() : null);
        m.put("endDate", it.getEndDate() != null ? it.getEndDate().toString() : null);
        m.put("observations", it.getObservations());

        if (it.getServiceCatalog() != null) {
            ServicioCatalogo sc = it.getServiceCatalog();
            Map<String, Object> svc = new LinkedHashMap<>();
            svc.put("id", sc.getId());
            svc.put("code", sc.getCode());
            svc.put("name", sc.getName());
            m.put("serviceCatalog", svc);
        }

        if (it.getProduct() != null) {
            Producto pr = it.getProduct();
            Map<String, Object> prod = new LinkedHashMap<>();
            prod.put("id", pr.getId());
            prod.put("code", pr.getCode());
            prod.put("name", pr.getName());
            m.put("product", prod);
        }

        if (it.getMechanic() != null) {
            Usuario u = it.getMechanic();
            Map<String, Object> mech = new LinkedHashMap<>();
            mech.put("id", u.getId());
            mech.put("name", u.getName());
            mech.put("lastName", u.getLastName());
            m.put("mechanic", mech);
        }

        if (it.getWorkOrder() != null) {
            Map<String, Object> wo = new LinkedHashMap<>();
            wo.put("id", it.getWorkOrder().getId());
            wo.put("orderNumber", it.getWorkOrder().getOrderNumber());
            m.put("workOrder", wo);
        }

        return m;
    }
}