package com.sigtm.backend.service;

import com.sigtm.backend.exception.DuplicateResourceException;
import com.sigtm.backend.exception.ResourceNotFoundException;
import com.sigtm.backend.model.Cliente;
import com.sigtm.backend.model.Vehiculo;
import com.sigtm.backend.model.RecepcionVehiculo;
import com.sigtm.backend.model.OrdenTrabajo;
import com.sigtm.backend.model.ItemOrdenTrabajo;
import com.sigtm.backend.repository.ClienteRepository;
import com.sigtm.backend.repository.RecepcionVehiculoRepository;
import com.sigtm.backend.repository.VehiculoRepository;
import com.sigtm.backend.repository.OrdenTrabajoRepository;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Administra la flota de vehículos de los clientes y su historial de visitas.
 *
 * <p>El borrado es lógico: los vehículos se desactivan para no afectar las citas, órdenes
 * de trabajo y recepciones ya registradas. El historial combina recepciones y órdenes de
 * trabajo en una única línea de tiempo.</p>
 */
@Service
@RequiredArgsConstructor
public class VehiculoService {

    private final VehiculoRepository vehiculoRepository;
    private final ClienteRepository clienteRepository;
    private final CodeGeneratorService codeGeneratorService;
    private final RecepcionVehiculoRepository recepcionRepository;
    private final OrdenTrabajoRepository ordenTrabajoRepository;
    private final AuditoriaService auditoriaService;

    /**
     * Lista todos los vehículos registrados, incluidos los desactivados.
     *
     * @return la colección de vehículos almacenada
     */
    @Transactional(readOnly = true)
    public List<Vehiculo> obtenerTodos() {
        return vehiculoRepository.findAll();
    }

    /**
     * Busca vehículos con búsqueda, filtro de estado, paginación y resumen.
     *
     * <p>La búsqueda cubre placa, código, marca, modelo, color, VIN y datos del
     * propietario. El resumen siempre refleja el total del padrón, no solo la
     * página o el filtro actual, para alimentar las tarjetas del tablero.</p>
     *
     * @param page   página solicitada, empezando en cero
     * @param size   tamaño de página; se limita a 100
     * @param search texto libre opcional
     * @param status {@code TODOS}, {@code ACTIVOS} o {@code INACTIVOS}
     * @param sort   orden solicitado
     * @return página de vehículos y resumen del padrón
     */
    @Transactional(readOnly = true)
    public Map<String, Object> buscarPaginado(int page, int size, String search, String status, String sort) {
        int pageIndex = Math.max(0, page);
        int pageSize = Math.min(100, Math.max(1, size));
        String texto = search == null ? null : search.trim().toLowerCase(Locale.ROOT);
        String estado = status == null ? "TODOS" : status.trim().toUpperCase(Locale.ROOT);

        Specification<Vehiculo> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if ("ACTIVOS".equals(estado)) {
                predicates.add(cb.isTrue(root.get("active")));
            } else if ("INACTIVOS".equals(estado)) {
                predicates.add(cb.isFalse(root.get("active")));
            }

            if (texto != null && !texto.isBlank()) {
                Join<Vehiculo, Cliente> cliente = root.join("customer", JoinType.LEFT);
                String like = "%" + texto + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("plate")), like),
                        cb.like(cb.lower(root.get("brand")), like),
                        cb.like(cb.lower(root.get("model")), like),
                        cb.like(cb.lower(root.get("code")), like),
                        cb.like(cb.lower(root.get("color")), like),
                        cb.like(cb.lower(root.get("vin")), like),
                        cb.like(cb.lower(cliente.get("firstName")), like),
                        cb.like(cb.lower(cliente.get("lastName")), like),
                        cb.like(cb.lower(cb.concat(cb.concat(cliente.get("firstName"), " "), cliente.get("lastName"))), like),
                        cb.like(cb.lower(cb.concat(cb.concat(cliente.get("lastName"), " "), cliente.get("firstName"))), like),
                        cb.like(cb.lower(cliente.get("documentNumber")), like)
                ));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };

        String ordenSolicitado = sort == null ? "reciente" : sort.trim().toLowerCase(Locale.ROOT);
        Sort orden = switch (ordenSolicitado) {
            case "antigua" -> Sort.by(Sort.Direction.ASC, "registrationDate");
            case "placa" -> Sort.by(Sort.Direction.ASC, "plate");
            case "kilometraje" -> Sort.by(Sort.Direction.DESC, "currentMileage");
            default -> Sort.by(Sort.Direction.DESC, "registrationDate")
                    .and(Sort.by(Sort.Direction.DESC, "id"));
        };

        Page<Vehiculo> resultado = vehiculoRepository.findAll(
                spec, PageRequest.of(pageIndex, pageSize, orden));

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("content", resultado.getContent());
        respuesta.put("page", resultado.getNumber() + 1);
        respuesta.put("size", resultado.getSize());
        respuesta.put("totalElements", resultado.getTotalElements());
        respuesta.put("totalPages", resultado.getTotalPages());
        respuesta.put("summary", resumenVehiculos());
        return respuesta;
    }

    private Map<String, Object> resumenVehiculos() {
        Map<String, Object> resumen = new LinkedHashMap<>();
        resumen.put("total", vehiculoRepository.count());
        resumen.put("active", vehiculoRepository.countByActiveTrue());
        resumen.put("inactive", vehiculoRepository.countByActiveFalse());
        resumen.put("withMileage", vehiculoRepository.countByCurrentMileageGreaterThan(0));
        return resumen;
    }

    /**
     * Obtiene un vehículo por su identificador.
     *
     * @param id identificador del vehículo
     * @return el vehículo solicitado
     * @throws ResourceNotFoundException si el vehículo no existe
     */
    @Transactional(readOnly = true)
    public Vehiculo obtenerPorId(Long id) {
        return vehiculoRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Vehículo no encontrado"));
    }

    /**
     * Lista los vehículos que pertenecen a un cliente.
     *
     * @param customerId identificador del cliente
     * @return los vehículos del cliente
     */
    @Transactional(readOnly = true)
    public List<Vehiculo> obtenerPorClienteId(Long customerId) {
        return vehiculoRepository.findByCustomerId(customerId);
    }

    /**
     * Registra un nuevo vehículo para un cliente.
     *
     * <p>La placa y, si se informa, el VIN deben ser únicos. Si no se indican, se generan
     * el código correlativo {@code VEH-000001}, la fecha de alta y el estado activo. El
     * alta se registra en la auditoría.</p>
     *
     * @param customerId identificador del cliente propietario
     * @param vehicle    datos del vehículo a registrar
     * @return el vehículo creado
     * @throws ResourceNotFoundException si el cliente no existe
     * @throws DuplicateResourceException si ya existe un vehículo con esa placa o VIN
     */
    @Transactional
    public Vehiculo crearVehiculo(Long customerId, Vehiculo vehicle) {
        Cliente cliente = clienteRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado"));
        
        if (vehiculoRepository.findByPlate(vehicle.getPlate()).isPresent()) {
            throw new DuplicateResourceException("El vehículo con placa " + vehicle.getPlate() + " ya existe.");
        }

        if (vehicle.getVin() != null && !vehicle.getVin().isBlank()
                && vehiculoRepository.findByVin(vehicle.getVin()).isPresent()) {
            throw new DuplicateResourceException("El VIN " + vehicle.getVin() + " ya está registrado en otro vehículo.");
        }

        if (vehicle.getCode() == null || vehicle.getCode().isBlank()) {
            vehicle.setCode(codeGeneratorService.nextCode("VEH"));
        }
        if (vehicle.getRegistrationDate() == null) {
            vehicle.setRegistrationDate(java.time.LocalDate.now());
        }
        if (vehicle.getActive() == null) {
            vehicle.setActive(true);
        }

        vehicle.setCustomer(cliente);
        Vehiculo guardado = vehiculoRepository.save(vehicle);
        auditoriaService.registrar("CREATE", "VEHICULO", guardado.getId(),
                "Registro de vehículo " + guardado.getCode() + " — placa " + guardado.getPlate());
        return guardado;
    }

    /**
     * Actualiza la ficha de un vehículo.
     *
     * <p>Se sobrescriben los datos técnicos y de contacto del vehículo; el cliente
     * propietario no se modifica. La operación se registra en la auditoría.</p>
     *
     * @param id               identificador del vehículo
     * @param detallesVehiculo nuevos datos del vehículo
     * @return el vehículo actualizado
     * @throws ResourceNotFoundException si el vehículo no existe
     */
    @Transactional
    public Vehiculo actualizarVehiculo(Long id, Vehiculo detallesVehiculo) {
        Vehiculo vehicle = obtenerPorId(id);
        vehicle.setPlate(detallesVehiculo.getPlate());
        vehicle.setVin(detallesVehiculo.getVin());
        vehicle.setBrand(detallesVehiculo.getBrand());
        vehicle.setModel(detallesVehiculo.getModel());
        vehicle.setYear(detallesVehiculo.getYear());
        vehicle.setColor(detallesVehiculo.getColor());
        vehicle.setVehicleType(detallesVehiculo.getVehicleType());
        vehicle.setFuelType(detallesVehiculo.getFuelType());
        vehicle.setTransmission(detallesVehiculo.getTransmission());
        vehicle.setCurrentMileage(detallesVehiculo.getCurrentMileage());
        vehicle.setActive(detallesVehiculo.getActive());
        vehicle.setObservations(detallesVehiculo.getObservations());
        Vehiculo guardado = vehiculoRepository.save(vehicle);
        auditoriaService.registrar("UPDATE", "VEHICULO", guardado.getId(),
                "Actualización de vehículo " + guardado.getCode() + " — placa " + guardado.getPlate());
        return guardado;
    }

    /**
     * Eliminación lógica: desactiva el vehículo (active=false) manteniendo su historial
     * y la integridad referencial con citas, órdenes de trabajo y recepciones.
     */
    @Transactional
    public void eliminarVehiculo(Long id) {
        Vehiculo vehicle = obtenerPorId(id);
        if (Boolean.TRUE.equals(vehicle.getActive())) {
            vehicle.setActive(false);
            vehiculoRepository.save(vehicle);
            auditoriaService.registrar("DELETE", "VEHICULO", vehicle.getId(),
                    "Vehículo desactivado: " + vehicle.getCode() + " — placa " + vehicle.getPlate());
        }
    }

    /**
     * Historial del vehículo: línea de tiempo generada automáticamente a partir de las
     * visitas (recepciones) y las órdenes de trabajo. Cada visita es un registro histórico;
     * el historial anterior nunca se elimina.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> obtenerHistorial(Long vehicleId) {
        Vehiculo vehicle = obtenerPorId(vehicleId);

        List<RecepcionVehiculo> recepciones =
                recepcionRepository.findByVehicleIdOrderByReceptionDateAsc(vehicleId);
        List<OrdenTrabajo> ordenesTrabajo = ordenTrabajoRepository.findByVehicleId(vehicleId);

        Map<Long, OrdenTrabajo> ordenPorRecepcionId = new HashMap<>();
        List<OrdenTrabajo> ordenesSinRecepcion = new ArrayList<>();
        for (OrdenTrabajo wo : ordenesTrabajo) {
            boolean cubierta = false;
            for (RecepcionVehiculo r : recepciones) {
                if (r.getWorkOrder() != null && r.getWorkOrder().getId().equals(wo.getId())) {
                    ordenPorRecepcionId.put(r.getId(), wo);
                    cubierta = true;
                    break;
                }
            }
            if (!cubierta) {
                ordenesSinRecepcion.add(wo);
            }
        }

        List<Map<String, Object>> visits = new ArrayList<>();
        for (RecepcionVehiculo r : recepciones) {
            visits.add(visitaRecepcion(r, ordenPorRecepcionId.get(r.getId())));
        }
        for (OrdenTrabajo wo : ordenesSinRecepcion) {
            visits.add(visitaOrden(wo));
        }

        visits.sort(Comparator.comparing(v -> (String) v.get("date")));

        Map<String, Object> resultado = new LinkedHashMap<>();
        Map<String, Object> infoVehiculo = new LinkedHashMap<>();
        infoVehiculo.put("id", vehicle.getId());
        infoVehiculo.put("code", vehicle.getCode());
        infoVehiculo.put("plate", vehicle.getPlate());
        infoVehiculo.put("brand", vehicle.getBrand());
        infoVehiculo.put("model", vehicle.getModel());
        infoVehiculo.put("year", vehicle.getYear());
        infoVehiculo.put("color", vehicle.getColor());
        infoVehiculo.put("currentMileage", vehicle.getCurrentMileage());
        resultado.put("vehicle", infoVehiculo);
        resultado.put("visits", visits);
        return resultado;
    }

    private Map<String, Object> visitaRecepcion(RecepcionVehiculo r, OrdenTrabajo wo) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.getId());
        m.put("type", "RECEPCION");
        m.put("code", r.getCode());
        m.put("date", r.getReceptionDate().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        m.put("mileage", r.getMileage());
        m.put("fuelLevel", r.getFuelLevel());
        m.put("receivedByName", r.getReceivedBy() != null
                ? r.getReceivedBy().getName() + " " + r.getReceivedBy().getLastName()
                : null);
        m.put("observations", r.getObservations());
        m.put("photos", fotos(r));

        if (wo != null) {
            String symptoms = wo.getCustomerSymptoms() != null && !wo.getCustomerSymptoms().isBlank()
                    ? wo.getCustomerSymptoms()
                    : r.getCustomerSymptoms();
            m.put("symptoms", symptoms);
            agregarDetallesOrden(m, wo);
        } else {
            m.put("status", r.getStatus());
            m.put("symptoms", r.getCustomerSymptoms());
            m.put("diagnosis", null);
            m.put("services", List.of());
            m.put("parts", List.of());
            m.put("mechanics", List.of());
            m.put("total", BigDecimal.ZERO);
        }
        return m;
    }

    private Map<String, Object> visitaOrden(OrdenTrabajo wo) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", wo.getId());
        m.put("type", "ORDEN_TRABAJO");
        m.put("code", wo.getOrderNumber());
        m.put("date", wo.getReceptionDate() != null
                ? wo.getReceptionDate().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                : null);
        m.put("mileage", wo.getCurrentMileage());
        m.put("fuelLevel", wo.getFuelLevel());
        m.put("receivedByName", null);
        m.put("observations", null);
        m.put("photos", List.of());
        m.put("symptoms", wo.getCustomerSymptoms());

        if (wo.getReceptionDate() != null) {
            agregarDetallesOrden(m, wo);
        } else {
            m.put("services", List.of());
            m.put("parts", List.of());
            m.put("mechanics", List.of());
            m.put("total", BigDecimal.ZERO);
        }
        return m;
    }

    private void agregarDetallesOrden(Map<String, Object> m, OrdenTrabajo wo) {
        m.put("orderNumber", wo.getOrderNumber());
        m.put("workOrderId", wo.getId());
        m.put("priority", wo.getPriority());
        m.put("status", wo.getStatus());
        m.put("diagnosis", wo.getTechnicalDiagnosis());

        List<ItemOrdenTrabajo> items = wo.getItems() != null ? wo.getItems() : List.of();
        List<Map<String, Object>> services = new ArrayList<>();
        List<Map<String, Object>> parts = new ArrayList<>();
        List<String> mechanics = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;

        for (ItemOrdenTrabajo it : items) {
            int qty = it.getQuantity() != null ? it.getQuantity() : 1;
            BigDecimal price = it.getPrice() != null ? it.getPrice() : BigDecimal.ZERO;
            BigDecimal subtotal = price.multiply(BigDecimal.valueOf(qty));
            total = total.add(subtotal);

            String mechanicName = it.getMechanic() != null
                    ? it.getMechanic().getName() + " " + it.getMechanic().getLastName()
                    : null;
            if (mechanicName != null && !mechanics.contains(mechanicName)) {
                mechanics.add(mechanicName);
            }

            Map<String, Object> itemMap = new LinkedHashMap<>();
            itemMap.put("id", it.getId());
            itemMap.put("description", it.getDescription());
            itemMap.put("price", price);
            itemMap.put("quantity", qty);
            itemMap.put("subtotal", subtotal);
            itemMap.put("status", it.getStatus());
            itemMap.put("mechanicName", mechanicName);

            if (it.getServiceCatalog() != null) {
                services.add(itemMap);
            } else {
                parts.add(itemMap);
            }
        }

        m.put("services", services);
        m.put("parts", parts);
        m.put("mechanics", mechanics);
        m.put("total", total);
    }

    private List<Map<String, Object>> fotos(RecepcionVehiculo r) {
        return r.getPhotos().stream().map(p -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", p.getId());
            m.put("category", p.getCategory());
            m.put("photoUrl", p.getPhotoUrl());
            return m;
        }).toList();
    }
}
