package com.sigtm.backend.service;

import com.sigtm.backend.exception.DuplicateResourceException;
import com.sigtm.backend.exception.ResourceNotFoundException;
import com.sigtm.backend.model.Cliente;
import com.sigtm.backend.repository.ClienteRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Administra el padrón de clientes del taller.
 *
 * <p>El borrado es lógico: los clientes se desactivan ({@code active = false}) para no
 * romper la integridad referencial con vehículos, órdenes de trabajo y facturas.</p>
 */
@Service
@RequiredArgsConstructor
public class ClienteService {

    private final ClienteRepository clienteRepository;
    private final CodeGeneratorService codeGeneratorService;
    private final AuditoriaService auditoriaService;

    /**
     * Lista todos los clientes registrados, incluidos los desactivados.
     *
     * @return la colección de clientes almacenada
     */
    @Transactional(readOnly = true)
    public List<Cliente> obtenerTodos() {
        return clienteRepository.findAll();
    }

    /**
     * Busca clientes con búsqueda, filtro de estado, paginación y resumen.
     *
     * @param page   página solicitada, empezando en cero
     * @param size   tamaño de página; se limita a 100
     * @param search texto libre opcional
     * @param status {@code TODOS}, {@code ACTIVOS} o {@code INACTIVOS}
     * @param sort   orden solicitado
     * @return página de clientes y resumen del padrón
     */
    @Transactional(readOnly = true)
    public Map<String, Object> buscarPaginado(int page, int size, String search, String status, String sort) {
        int pageIndex = Math.max(0, page);
        int pageSize = Math.min(100, Math.max(1, size));
        String texto = search == null ? null : search.trim().toLowerCase(Locale.ROOT);
        String estado = status == null ? "TODOS" : status.trim().toUpperCase(Locale.ROOT);

        Specification<Cliente> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if ("ACTIVOS".equals(estado)) {
                predicates.add(cb.isTrue(root.get("active")));
            } else if ("INACTIVOS".equals(estado)) {
                predicates.add(cb.isFalse(root.get("active")));
            }
            if (texto != null && !texto.isBlank()) {
                String like = "%" + texto + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("firstName")), like),
                        cb.like(cb.lower(root.get("lastName")), like),
                        cb.like(cb.lower(root.get("documentNumber")), like),
                        cb.like(cb.lower(root.get("code")), like),
                        cb.like(cb.lower(root.get("phone")), like),
                        cb.like(cb.lower(root.get("whatsapp")), like),
                        cb.like(cb.lower(root.get("email")), like)
                ));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };

        String ordenSolicitado = sort == null ? "reciente" : sort.trim().toLowerCase(Locale.ROOT);
        Sort orden = switch (ordenSolicitado) {
            case "antigua" -> Sort.by(Sort.Direction.ASC, "registrationDate");
            case "nombre" -> Sort.by(Sort.Direction.ASC, "firstName")
                    .and(Sort.by(Sort.Direction.ASC, "lastName"));
            case "codigo" -> Sort.by(Sort.Direction.ASC, "code");
            default -> Sort.by(Sort.Direction.DESC, "registrationDate")
                    .and(Sort.by(Sort.Direction.DESC, "id"));
        };

        Page<Cliente> resultado = clienteRepository.findAll(
                spec, PageRequest.of(pageIndex, pageSize, orden));

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("content", resultado.getContent());
        respuesta.put("page", resultado.getNumber() + 1);
        respuesta.put("size", resultado.getSize());
        respuesta.put("totalElements", resultado.getTotalElements());
        respuesta.put("totalPages", resultado.getTotalPages());
        respuesta.put("summary", resumenClientes());
        return respuesta;
    }

    private Map<String, Object> resumenClientes() {
        Map<String, Object> resumen = new LinkedHashMap<>();
        resumen.put("total", clienteRepository.count());
        resumen.put("active", clienteRepository.countByActiveTrue());
        resumen.put("inactive", clienteRepository.countByActiveFalse());
        resumen.put("whatsapp", clienteRepository.countByWhatsappIsNotNullAndWhatsappNot(""));
        return resumen;
    }

    /**
     * Obtiene un cliente por su identificador.
     *
     * @param id identificador del cliente
     * @return el cliente solicitado
     * @throws ResourceNotFoundException si el cliente no existe
     */
    @Transactional(readOnly = true)
    public Cliente obtenerPorId(Long id) {
        return clienteRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado"));
    }

    /**
     * Registra un nuevo cliente en el padrón.
     *
     * <p>El documento es obligatorio y único. Si no se informan, se generan el código
     * correlativo {@code CLI-000001}, la fecha de alta y el estado activo. El alta se
     * registra en la auditoría con la acción {@code CREATE}.</p>
     *
     * @param cliente datos del cliente a registrar
     * @return el cliente creado
     * @throws DuplicateResourceException si ya existe un cliente con ese documento
     */
    @Transactional
    public Cliente crearCliente(Cliente cliente) {
        if (clienteRepository.findByDocumentNumber(cliente.getDocumentNumber()).isPresent()) {
            throw new DuplicateResourceException("El cliente con documento " + cliente.getDocumentNumber() + " ya existe.");
        }
        if (cliente.getCode() == null || cliente.getCode().isBlank()) {
            cliente.setCode(codeGeneratorService.nextCode("CLI"));
        }
        if (cliente.getRegistrationDate() == null) {
            cliente.setRegistrationDate(java.time.LocalDate.now());
        }
        if (cliente.getActive() == null) {
            cliente.setActive(true);
        }
        Cliente guardado = clienteRepository.save(cliente);
        auditoriaService.registrar("CREATE", "CLIENTE", guardado.getId(),
                "Registro de cliente " + guardado.getCode() + " — " + guardado.getFirstName() + " " + guardado.getLastName());
        return guardado;
    }

    /**
     * Actualiza los datos de contacto y el estado de un cliente existente.
     *
     * <p>El documento y el código no se modifican. La operación queda registrada en la
     * auditoría con la acción {@code UPDATE}.</p>
     *
     * @param id              identificador del cliente
     * @param detallesCliente nuevos datos del cliente
     * @return el cliente actualizado
     * @throws ResourceNotFoundException si el cliente no existe
     */
    @Transactional
    public Cliente actualizarCliente(Long id, Cliente detallesCliente) {
        Cliente cliente = obtenerPorId(id);
        cliente.setFirstName(detallesCliente.getFirstName());
        cliente.setLastName(detallesCliente.getLastName());
        cliente.setPhone(detallesCliente.getPhone());
        cliente.setWhatsapp(detallesCliente.getWhatsapp());
        cliente.setEmail(detallesCliente.getEmail());
        cliente.setAddress(detallesCliente.getAddress());
        cliente.setActive(detallesCliente.getActive());
        cliente.setObservations(detallesCliente.getObservations());
        Cliente guardado = clienteRepository.save(cliente);
        auditoriaService.registrar("UPDATE", "CLIENTE", guardado.getId(),
                "Actualización de cliente " + guardado.getCode() + " — " + guardado.getFirstName() + " " + guardado.getLastName());
        return guardado;
    }

    /**
     * Eliminación lógica: desactiva al cliente (active=false) manteniendo su historial
     * y la integridad referencial con vehículos, órdenes y facturas.
     */
    @Transactional
    public void eliminarCliente(Long id) {
        Cliente cliente = obtenerPorId(id);
        if (Boolean.TRUE.equals(cliente.getActive())) {
            cliente.setActive(false);
            clienteRepository.save(cliente);
            auditoriaService.registrar("DELETE", "CLIENTE", cliente.getId(),
                    "Cliente desactivado: " + cliente.getCode() + " — "
                            + cliente.getFirstName() + " " + cliente.getLastName());
        }
    }
}
