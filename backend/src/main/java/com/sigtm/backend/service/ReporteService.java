package com.sigtm.backend.service;

import com.sigtm.backend.model.Cita;
import com.sigtm.backend.model.Cliente;
import com.sigtm.backend.model.Producto;
import com.sigtm.backend.model.Vehiculo;
import com.sigtm.backend.model.OrdenTrabajo;
import com.sigtm.backend.model.ItemOrdenTrabajo;
import com.sigtm.backend.repository.CitaRepository;
import com.sigtm.backend.repository.ClienteRepository;
import com.sigtm.backend.repository.FacturaRepository;
import com.sigtm.backend.repository.ProductoRepository;
import com.sigtm.backend.repository.VehiculoRepository;
import com.sigtm.backend.repository.ItemOrdenTrabajoRepository;
import com.sigtm.backend.repository.OrdenTrabajoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;

/**
 * Construye los indicadores del panel de control y los reportes tabulares del centro de
 * reportes.
 *
 * <p>Los reportes devuelven columnas, tipos de dato, filas y totales ya preparados para
 * su exportación, y los gráficos del panel admiten los periodos {@code HOY}, {@code 7},
 * {@code 30} o {@code YEAR}.</p>
 */
@Service
@RequiredArgsConstructor
public class ReporteService {

    private final ClienteRepository clienteRepository;
    private final OrdenTrabajoRepository ordenTrabajoRepository;
    private final FacturaRepository facturaRepository;
    private final CitaRepository citaRepository;
    private final ProductoRepository productoRepository;
    private final VehiculoRepository vehiculoRepository;
    private final ItemOrdenTrabajoRepository itemOrdenTrabajoRepository;

    /**
     * Calcula los indicadores globales del panel de control.
     *
     * <p>Los ingresos suman únicamente el total de las facturas en estado
     * {@code PAID}.</p>
     *
     * @return un mapa con {@code totalCustomers}, {@code totalWorkOrders},
     *         {@code totalRevenue} y {@code pendingAppointments}
     */
    @Transactional(readOnly = true)
    public Map<String, Object> obtenerMetricasDashboard() {
        Map<String, Object> metricas = new HashMap<>();

        long totalCustomers = clienteRepository.count();
        long totalWorkOrders = ordenTrabajoRepository.count();
        long pendingAppointments = citaRepository.count();

        // Calculate total revenue from paid invoices
        BigDecimal totalRevenue = facturaRepository.findByStatus("PAID")
                .stream()
                .map(factura -> factura.getTotalAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        metricas.put("totalCustomers", totalCustomers);
        metricas.put("totalWorkOrders", totalWorkOrders);
        metricas.put("totalRevenue", totalRevenue);
        metricas.put("pendingAppointments", pendingAppointments);

        return metricas;
    }

    /**
     * Desglosa los ingresos de los últimos doce meses separados en servicios y repuestos.
     *
     * <p>Solo se consideran las facturas pagadas ({@code PAID}) y cada ítem se clasifica
     * como servicio o repuesto según tenga o no servicio del catálogo asociado. Los
     * meses sin facturación se devuelven con importe {@code 0} para no romper la serie.</p>
     *
     * @return una fila por mes con los campos {@code name}, {@code servicios} y {@code repuestos}
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> obtenerIngresosMensuales() {
        DateTimeFormatter formatoMes = DateTimeFormatter.ofPattern("MMM", new Locale("es", "PE"));

        YearMonth inicio = YearMonth.now().minusMonths(11);
        Map<YearMonth, Map<String, Object>> porMes = new LinkedHashMap<>();
        for (int i = 0; i < 12; i++) {
            YearMonth ym = inicio.plusMonths(i);
            Map<String, Object> fila = new HashMap<>();
            fila.put("name", ym.format(formatoMes));
            fila.put("servicios", BigDecimal.ZERO);
            fila.put("repuestos", BigDecimal.ZERO);
            porMes.put(ym, fila);
        }

        facturaRepository.findByStatus("PAID").forEach(factura -> {
            YearMonth ym = YearMonth.from(factura.getIssueDate());
            Map<String, Object> fila = porMes.get(ym);
            if (fila == null) return;
            if (factura.getWorkOrder() != null) {
                factura.getWorkOrder().getItems().forEach(item -> {
                    BigDecimal total = item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
                    if (item.getServiceCatalog() != null) {
                        fila.put("servicios", ((BigDecimal) fila.get("servicios")).add(total));
                    } else {
                        fila.put("repuestos", ((BigDecimal) fila.get("repuestos")).add(total));
                    }
                });
            }
        });

        return new ArrayList<>(porMes.values());
    }

    /**
     * Obtiene los seis servicios más solicitados a partir de los ítems facturados.
     *
     * <p>El conteo suma las cantidades de cada servicio del catálogo presente en las
     * órdenes con factura, sin filtrar por el estado de la factura. Si hay menos de seis
     * servicios distintos se devuelven todos.</p>
     *
     * @return los servicios con mayor demanda como pares {@code name}/{@code value}
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> obtenerServiciosDestacados() {
        Map<String, Integer> conteos = new HashMap<>();
        facturaRepository.findAll().forEach(factura -> {
            if (factura.getWorkOrder() != null) {
                factura.getWorkOrder().getItems().forEach(item -> {
                    if (item.getServiceCatalog() != null) {
                        conteos.merge(item.getServiceCatalog().getName(),
                                item.getQuantity(), Integer::sum);
                    }
                });
            }
        });

        return conteos.entrySet().stream()
                .sorted(Map.Entry.comparingByValue(Comparator.reverseOrder()))
                .limit(6)
                .map(entrada -> {
                    Map<String, Object> fila = new HashMap<>();
                    fila.put("name", entrada.getKey());
                    fila.put("value", entrada.getValue());
                    return fila;
                })
                .toList();
    }

    // ---------------- Centro de Reportes ----------------

    /**
     * Construye el reporte tabular solicitado para el centro de reportes.
     *
     * <p>El tipo se normaliza a mayúsculas y admite {@code VEHICULOS},
     * {@code REPARACIONES}, {@code INVENTARIO} y {@code CITAS}; cualquier otro valor
     * devuelve el reporte de {@code CLIENTES}. Cada reporte incluye columnas, tipos de
     * dato, filas y totales listos para exportar.</p>
     *
     * @param tipo tipo de reporte solicitado; puede ser {@code null}
     * @return el reporte en formato {@code Map}
     */
    @Transactional(readOnly = true)
    public Map<String, Object> obtenerCentroReportes(String tipo) {
        String t = (tipo == null ? "" : tipo.trim().toUpperCase());
        return switch (t) {
            case "VEHICULOS" -> reportVehiculos();
            case "REPARACIONES" -> reportReparaciones();
            case "INVENTARIO" -> reportInventario();
            case "CITAS" -> reportCitas();
            default -> reportClientes();
        };
    }

    private Map<String, Object> reportClientes() {
        DateTimeFormatter fecha = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        Map<Long, Long> ordenes = contarPorCampoDeOrden(o -> o.getCustomer() != null ? o.getCustomer().getId() : null);
        List<Cliente> clientes = clienteRepository.findAll();
        List<List<Object>> filas = new ArrayList<>();
        long totalVehiculos = 0L;
        long totalOrdenes = 0L;
        for (Cliente c : clientes) {
            long nVehicles = c.getVehicles() == null ? 0 : c.getVehicles().size();
            long nOrdenes = ordenes.getOrDefault(c.getId(), 0L);
            totalVehiculos += nVehicles;
            totalOrdenes += nOrdenes;
            filas.add(List.of(
                    txt(c.getCode()),
                    c.getFirstName() + " " + txt(c.getLastName()),
                    txt(c.getDocumentNumber()),
                    txt(c.getPhone()),
                    txt(c.getEmail()),
                    nVehicles,
                    nOrdenes,
                    c.getRegistrationDate() == null ? "" : c.getRegistrationDate().format(fecha)
            ));
        }
        List<Map<String, Object>> totales = new ArrayList<>();
        totales.add(crearTotal("Clientes registrados", (long) clientes.size()));
        totales.add(crearTotal("Vehículos registrados", totalVehiculos));
        totales.add(crearTotal("Órdenes de trabajo", totalOrdenes));
        return crearCentro("CLIENTES", "Reporte de Clientes", List.of("Código", "Cliente", "Documento", "Teléfono", "Correo",
                "Vehículos", "Órdenes", "Registrado"),
                List.of("TEXT", "TEXT", "TEXT", "TEXT", "TEXT", "NUM", "NUM", "TEXT"), filas, totales);
    }

    private Map<String, Object> reportVehiculos() {
        DateTimeFormatter fecha = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        Map<Long, Long> ordenes = contarPorCampoDeOrden(o -> o.getVehicle() != null ? o.getVehicle().getId() : null);
        List<Vehiculo> vehiculos = vehiculoRepository.findAll();
        List<List<Object>> filas = new ArrayList<>();
        long totalOrdenes = 0L;
        for (Vehiculo v : vehiculos) {
            String cliente = v.getCustomer() == null ? "-"
                    : v.getCustomer().getFirstName() + " " + txt(v.getCustomer().getLastName());
            long nOrdenes = ordenes.getOrDefault(v.getId(), 0L);
            totalOrdenes += nOrdenes;
            filas.add(List.of(
                    txt(v.getCode()),
                    v.getPlate(),
                    txt(v.getBrand()),
                    txt(v.getModel()),
                    v.getYear() == null ? "" : v.getYear(),
                    txt(v.getColor()),
                    cliente.trim(),
                    nOrdenes,
                    v.getRegistrationDate() == null ? "" : v.getRegistrationDate().format(fecha)
            ));
        }
        List<Map<String, Object>> totales = new ArrayList<>();
        totales.add(crearTotal("Vehículos registrados", (long) vehiculos.size()));
        totales.add(crearTotal("Órdenes asociadas", totalOrdenes));
        return crearCentro("VEHICULOS", "Reporte de Vehículos", List.of("Código", "Placa", "Marca", "Modelo", "Año", "Color",
                "Cliente", "Órdenes", "Registrado"),
                List.of("TEXT", "TEXT", "TEXT", "TEXT", "NUM", "TEXT", "TEXT", "NUM", "TEXT"), filas, totales);
    }

    private Map<String, Object> reportReparaciones() {
        DateTimeFormatter fechaHora = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        List<OrdenTrabajo> ordenes = ordenTrabajoRepository.findAll();
        List<List<Object>> filas = new ArrayList<>();
        BigDecimal totalGeneral = BigDecimal.ZERO;
        long totalMecanicos = 0L;
        Set<String> mecanicos = new HashSet<>();
        for (OrdenTrabajo o : ordenes) {
            String cliente = o.getCustomer() == null ? "-"
                    : o.getCustomer().getFirstName() + " " + txt(o.getCustomer().getLastName());
            String vehiculo = o.getVehicle() == null ? "-"
                    : txt(o.getVehicle().getPlate()) + " " + txt(o.getVehicle().getBrand()) + " " + txt(o.getVehicle().getModel());
            BigDecimal total = BigDecimal.ZERO;
            if (o.getItems() != null) {
                for (ItemOrdenTrabajo item : o.getItems()) {
                    if (item.getPrice() != null) {
                        int qty = item.getQuantity() == null ? 1 : item.getQuantity();
                        total = total.add(item.getPrice().multiply(BigDecimal.valueOf(qty)));
                    }
                    if (item.getMechanic() != null) {
                        mecanicos.add(normalizarNombre(item.getMechanic().getName() + " " + txt(item.getMechanic().getLastName())));
                    }
                }
            }
            totalGeneral = totalGeneral.add(total);
            filas.add(List.of(
                    txt(o.getOrderNumber()),
                    o.getReceptionDate() == null ? "" : o.getReceptionDate().format(fechaHora),
                    cliente.trim(),
                    vehiculo.trim(),
                    etiquetaPrioridad(o.getPriority()),
                    etiquetaEstadoOrden(o.getStatus()),
                    total
            ));
        }
        totalMecanicos = mecanicos.size();
        List<Map<String, Object>> totales = new ArrayList<>();
        totales.add(crearTotal("Órdenes de trabajo", (long) ordenes.size()));
        totales.add(crearTotal("Mecánicos involucrados", totalMecanicos));
        totales.add(crearTotal("Total facturable", totalGeneral, true));
        return crearCentro("REPARACIONES", "Reporte de Reparaciones", List.of("N° Orden", "Fecha recepción", "Cliente", "Vehículo",
                "Prioridad", "Estado", "Total"),
                List.of("TEXT", "TEXT", "TEXT", "TEXT", "TEXT", "TEXT", "MONEY"), filas, totales);
    }

    private Map<String, Object> reportInventario() {
        List<Producto> productos = productoRepository.findByActiveTrue();
        List<List<Object>> filas = new ArrayList<>();
        BigDecimal valorTotal = BigDecimal.ZERO;
        long stockBajo = 0L;
        long agotados = 0L;
        for (Producto p : productos) {
            int stock = p.getCurrentStock() == null ? 0 : p.getCurrentStock();
            int min = p.getMinStock() == null ? 0 : p.getMinStock();
            BigDecimal valor = (p.getSalePrice() == null ? BigDecimal.ZERO : p.getSalePrice()).multiply(BigDecimal.valueOf(stock));
            valorTotal = valorTotal.add(valor);
            String estado;
            if (stock == 0) {
                estado = "Agotado";
                agotados++;
            } else if (stock <= min) {
                estado = "Stock bajo";
                stockBajo++;
            } else {
                estado = "Disponible";
            }
            filas.add(List.of(
                    txt(p.getCode()),
                    txt(p.getName()),
                    txt(p.getBrand()),
                    txt(p.getCategory()),
                    stock,
                    min,
                    p.getPurchasePrice(),
                    p.getSalePrice(),
                    valor,
                    estado
            ));
        }
        List<Map<String, Object>> totales = new ArrayList<>();
        totales.add(crearTotal("Productos activos", (long) productos.size()));
        totales.add(crearTotal("Valor de inventario", valorTotal, true));
        totales.add(crearTotal("Productos con stock bajo", stockBajo));
        totales.add(crearTotal("Productos agotados", agotados));
        return crearCentro("INVENTARIO", "Reporte de Inventario", List.of("Código", "Producto", "Marca", "Categoría", "Stock",
                "Stock mín.", "P. compra", "P. venta", "Valor inv.", "Estado"),
                List.of("TEXT", "TEXT", "TEXT", "TEXT", "NUM", "NUM", "MONEY", "MONEY", "MONEY", "TEXT"), filas, totales);
    }

    private Map<String, Object> reportCitas() {
        DateTimeFormatter fecha = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        DateTimeFormatter hora = DateTimeFormatter.ofPattern("HH:mm");
        List<Cita> citas = citaRepository.findAll();
        List<List<Object>> filas = new ArrayList<>();
        long completadas = 0L;
        long canceladas = 0L;
        long confirmadas = 0L;
        for (Cita a : citas) {
            if ("COMPLETED".equalsIgnoreCase(a.getStatus())) completadas++;
            else if ("CANCELLED".equalsIgnoreCase(a.getStatus())) canceladas++;
            else if ("CONFIRMED".equalsIgnoreCase(a.getStatus())) confirmadas++;
            String cliente = a.getCustomer() == null ? "-"
                    : a.getCustomer().getFirstName() + " " + txt(a.getCustomer().getLastName());
            String vehiculo = a.getVehicle() == null ? "-"
                    : txt(a.getVehicle().getPlate()) + " " + txt(a.getVehicle().getModel());
            filas.add(List.of(
                    a.getId(),
                    a.getAppointmentDate() == null ? "" : a.getAppointmentDate().format(fecha),
                    a.getAppointmentTime() == null ? "" : a.getAppointmentTime().format(hora),
                    cliente.trim(),
                    vehiculo.trim(),
                    txt(a.getRequestedService()),
                    etiquetaPrioridad(a.getPriority()),
                    etiquetaEstadoCita(a.getStatus())
            ));
        }
        List<Map<String, Object>> totales = new ArrayList<>();
        totales.add(crearTotal("Citas registradas", (long) citas.size()));
        totales.add(crearTotal("Confirmadas", confirmadas));
        totales.add(crearTotal("Completadas", completadas));
        totales.add(crearTotal("Canceladas", canceladas));
        return crearCentro("CITAS", "Reporte de Citas", List.of("N°", "Fecha", "Hora", "Cliente", "Vehículo", "Servicio",
                "Prioridad", "Estado"),
                List.of("TEXT", "TEXT", "TEXT", "TEXT", "TEXT", "TEXT", "TEXT", "TEXT"), filas, totales);
    }

    private Map<Long, Long> contarPorCampoDeOrden(Function<OrdenTrabajo, Long> extractorClave) {
        Map<Long, Long> m = new HashMap<>();
        ordenTrabajoRepository.findAll().forEach(o -> {
            Long k = extractorClave.apply(o);
            if (k != null) m.merge(k, 1L, Long::sum);
        });
        return m;
    }

    private Map<String, Object> crearCentro(String tipo, String titulo, List<String> columnas, List<String> tipos,
                                       List<List<Object>> filas, List<Map<String, Object>> totales) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("tipo", tipo);
        m.put("titulo", titulo);
        m.put("columnas", columnas);
        m.put("tipos", tipos);
        m.put("filas", filas);
        m.put("totales", totales);
        return m;
    }

    private Map<String, Object> crearTotal(String etiqueta, Object valor) {
        return crearTotal(etiqueta, valor, false);
    }

    private Map<String, Object> crearTotal(String etiqueta, Object valor, boolean money) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("etiqueta", etiqueta);
        m.put("valor", valor);
        if (money) m.put("money", true);
        return m;
    }

    private String etiquetaEstadoOrden(String s) {
        if (s == null) return "";
        return switch (s.toUpperCase()) {
            case "RECIBIDO" -> "Recibido";
            case "EN_DIAGNOSTICO" -> "En diagnóstico";
            case "DIAGNOSTICO_REALIZADO" -> "Diagnóstico realizado";
            case "PENDIENTE_APROBACION" -> "Pendiente de aprobación";
            case "EN_REPARACION" -> "En reparación";
            case "PAUSADO" -> "Pausado";
            case "ESPERANDO_REPUESTOS" -> "Esperando repuestos";
            case "LISTO_PARA_ENTREGA" -> "Listo para entrega";
            case "FINALIZADO" -> "Finalizado";
            case "ENTREGADO" -> "Entregado";
            default -> s;
        };
    }

    private String etiquetaEstadoCita(String s) {
        if (s == null) return "";
        return switch (s.toUpperCase()) {
            case "PENDING" -> "Pendiente";
            case "CONFIRMED" -> "Confirmada";
            case "CANCELLED" -> "Cancelada";
            case "NO_SHOW" -> "No asistió";
            case "IN_PROCESS" -> "En proceso";
            case "COMPLETED" -> "Completada";
            default -> s;
        };
    }

    private String etiquetaPrioridad(String p) {
        if (p == null) return "";
        return switch (p.toUpperCase()) {
            case "NORMAL" -> "Normal";
            case "ALTA", "HIGH" -> "Alta";
            case "URGENTE", "URGENT" -> "Urgente";
            default -> p;
        };
    }

    private String txt(Object v) {
        return v == null ? "" : v.toString();
    }

    private String normalizarNombre(String s) {
        return s == null ? "" : s.trim().replaceAll("\\s+", " ");
    }

    /**
     * Calcula las tarjetas de resumen del panel de control para un periodo.
     *
     * <p>Los ingresos consideran las facturas pagadas ({@code PAID}) emitidas dentro del
     * periodo, y las órdenes se agrupan en pendientes, en proceso, listas y finalizadas.
     * El periodo admite {@code HOY}, {@code 7}, {@code 30} o {@code YEAR}.</p>
     *
     * @param periodo periodo a resumir; {@code null} equivale a {@code 30}
     * @return un mapa con los contadores e importes del panel
     */
    @Transactional(readOnly = true)
    public Map<String, Object> obtenerResumenDashboard(String periodo) {
        LocalDateTime from = inicioPeriodo(periodo);
        LocalDateTime to = LocalDateTime.now();

        List<OrdenTrabajo> ordenes = ordenTrabajoRepository.findAll();
        List<Producto> productos = productoRepository.findByActiveTrue();

        BigDecimal ingresos = facturaRepository.findByStatus("PAID").stream()
                .filter(i -> i.getIssueDate() != null && i.getIssueDate().isAfter(from) && i.getIssueDate().isBefore(to.plusSeconds(1)))
                .map(i -> i.getTotalAmount() != null ? i.getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal valorInventario = productos.stream()
                .map(p -> p.getSalePrice() != null
                        ? p.getSalePrice().multiply(BigDecimal.valueOf(p.getCurrentStock() != null ? p.getCurrentStock() : 0))
                        : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> s = new LinkedHashMap<>();
        s.put("clientesRegistrados", clienteRepository.count());
        s.put("vehiculosRegistrados", vehiculoRepository.count());
        s.put("citasDelDia", citaRepository.findByAppointmentDate(LocalDate.now()).stream()
                .filter(a -> !"CANCELLED".equalsIgnoreCase(a.getStatus()))
                .count());
        s.put("ordenesPendientes", contarPorEstados(ordenes, "RECIBIDO", "EN_DIAGNOSTICO", "DIAGNOSTICO_REALIZADO", "PENDIENTE_APROBACION"));
        s.put("ordenesEnProceso", contarPorEstados(ordenes, "EN_REPARACION", "PAUSADO"));
        s.put("vehiculosListos", contarPorEstados(ordenes, "LISTO_PARA_ENTREGA"));
        s.put("reparacionesFinalizadas", contarPorEstados(ordenes, "FINALIZADO"));
        s.put("ingresos", ingresos);
        s.put("valorInventario", valorInventario);
        s.put("stockBajo", productos.stream()
                .filter(p -> p.getCurrentStock() != null && p.getCurrentStock() > 0 && p.getCurrentStock() <= p.getMinStock())
                .count());
        s.put("productosAgotados", productos.stream()
                .filter(p -> p.getCurrentStock() != null && p.getCurrentStock() == 0)
                .count());
        return s;
    }

    /**
     * Construye la serie temporal del gráfico de líneas del panel de control.
     *
     * <p>Cada segmento acumula las citas no canceladas, las órdenes de trabajo, los
     * vehículos distintos y los ingresos por facturas pagadas del intervalo. La
     * granularidad es por hora para {@code HOY}, por día para {@code 7} y {@code 30}, y
     * por mes para {@code YEAR}.</p>
     *
     * @param periodo periodo a representar; {@code null} equivale a {@code 30}
     * @return la lista de segmentos con {@code citas}, {@code reparaciones},
     *         {@code ingresos} y {@code vehiculos}
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> obtenerLineaDashboard(String periodo) {
        LocalDateTime from = inicioPeriodo(periodo);
        LocalDateTime to = LocalDateTime.now();
        List<Map<String, Object>> segmentos = crearSegmentos(periodo, from, to);

        citaRepository.findAll().forEach(a -> {
            if (a.getAppointmentDate() == null || "CANCELLED".equalsIgnoreCase(a.getStatus())) return;
            LocalDateTime key = a.getAppointmentDate().atTime(a.getAppointmentTime() != null ? a.getAppointmentTime() : LocalTime.NOON);
            int idx = indiceSegmento(periodo, from, key);
            if (idx >= 0 && idx < segmentos.size()) incrementar(segmentos.get(idx), "citas", 1);
        });

        ordenTrabajoRepository.findAll().forEach(o -> {
            if (o.getReceptionDate() == null) return;
            int idx = indiceSegmento(periodo, from, o.getReceptionDate());
            if (idx < 0 || idx >= segmentos.size()) return;
            Map<String, Object> bucket = segmentos.get(idx);
            incrementar(bucket, "reparaciones", 1);
            if (o.getVehicle() != null && o.getVehicle().getId() != null) {
                incrementarVehiculo(bucket, o.getVehicle().getId());
            }
        });

        facturaRepository.findByStatus("PAID").forEach(i -> {
            if (i.getIssueDate() == null) return;
            int idx = indiceSegmento(periodo, from, i.getIssueDate());
            if (idx >= 0 && idx < segmentos.size()) {
                incrementar(segmentos.get(idx), "ingresos", i.getTotalAmount() != null ? i.getTotalAmount().doubleValue() : 0);
            }
        });

        return segmentos;
    }

    /**
     * Agrupa las órdenes de trabajo por etapa para el gráfico de anillo del panel.
     *
     * <p>Las categorías son {@code Pendientes}, {@code Diagnóstico}, {@code Reparación},
     * {@code Listos} y {@code Entregados}, según el estado de cada orden.</p>
     *
     * @return los grupos como pares {@code name}/{@code value}
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> obtenerDonutDashboard() {
        List<OrdenTrabajo> ordenes = ordenTrabajoRepository.findAll();
        Map<String, Long> groups = new LinkedHashMap<>();
        groups.put("Pendientes", contarPorEstados(ordenes, "RECIBIDO"));
        groups.put("Diagnóstico", contarPorEstados(ordenes, "EN_DIAGNOSTICO", "DIAGNOSTICO_REALIZADO", "PENDIENTE_APROBACION"));
        groups.put("Reparación", contarPorEstados(ordenes, "EN_REPARACION", "PAUSADO"));
        groups.put("Listos", contarPorEstados(ordenes, "LISTO_PARA_ENTREGA"));
        groups.put("Entregados", contarPorEstados(ordenes, "FINALIZADO"));
        return groups.entrySet().stream().map(e -> {
            Map<String, Object> fila = new LinkedHashMap<>();
            fila.put("name", e.getKey());
            fila.put("value", e.getValue());
            return fila;
        }).toList();
    }

    /**
     * Construye los datos de los gráficos de barras del panel de control.
     *
     * <p>Se cuentan los servicios y repuestos más usados, las reparaciones por periodo y
     * los trabajos por mecánico, limitando a seis elementos las series de servicios,
     * repuestos y mecánicos. Las fechas consideradas son las de recepción de la orden
     * dentro del periodo.</p>
     *
     * @param periodo periodo a analizar; {@code null} equivale a {@code 30}
     * @return un mapa con {@code servicios}, {@code repuestos},
     *         {@code reparacionesPorPeriodo} y {@code trabajosPorMecanico}
     */
    @Transactional(readOnly = true)
    public Map<String, Object> obtenerBarrasDashboard(String periodo) {
        LocalDateTime from = inicioPeriodo(periodo);
        LocalDateTime to = LocalDateTime.now();
        DateTimeFormatter formatoMes = DateTimeFormatter.ofPattern("MMM", new Locale("es", "PE"));

        Map<String, Integer> servicios = new HashMap<>();
        Map<String, Integer> repuestos = new HashMap<>();
        Map<String, Integer> porMecanico = new HashMap<>();

        itemOrdenTrabajoRepository.findAll().forEach(item -> {
            if (item.getWorkOrder() == null || item.getWorkOrder().getReceptionDate() == null) return;
            LocalDateTime rd = item.getWorkOrder().getReceptionDate();
            if (rd.isBefore(from) || rd.isAfter(to.plusSeconds(1))) return;
            int qty = item.getQuantity() != null ? item.getQuantity() : 1;
            if (item.getServiceCatalog() != null) {
                servicios.merge(item.getServiceCatalog().getName(), qty, Integer::sum);
            } else if (item.getProduct() != null) {
                repuestos.merge(item.getDescription(), qty, Integer::sum);
            } else {
                // Concepto personalizado: se considera mano de obra/servicio, no repuesto.
                servicios.merge(item.getDescription(), qty, Integer::sum);
            }
            if (item.getMechanic() != null) {
                porMecanico.merge(item.getMechanic().getName() + " " + item.getMechanic().getLastName(), 1, Integer::sum);
            }
        });

        List<Map<String, Object>> reparaciones = new ArrayList<>();
        Map<YearMonth, Map<String, Object>> porMes = new LinkedHashMap<>();
        YearMonth firstYm = YearMonth.from(from);
        YearMonth lastYm = YearMonth.from(to);
        for (YearMonth ym = firstYm; ym.isBefore(lastYm.plusMonths(1)); ym = ym.plusMonths(1)) {
            Map<String, Object> fila = new LinkedHashMap<>();
            fila.put("name", ym.format(formatoMes));
            fila.put("value", 0L);
            porMes.put(ym, fila);
            reparaciones.add(fila);
        }
        ordenTrabajoRepository.findAll().forEach(o -> {
            if (o.getReceptionDate() == null || o.getReceptionDate().isBefore(from) || o.getReceptionDate().isAfter(to.plusSeconds(1))) return;
            YearMonth ym = YearMonth.from(o.getReceptionDate());
            Map<String, Object> fila = porMes.get(ym);
            if (fila != null) fila.put("value", ((Number) fila.get("value")).longValue() + 1);
        });

        Map<String, Object> resultado = new LinkedHashMap<>();
        resultado.put("servicios", primerosN(servicios, 6));
        resultado.put("repuestos", primerosN(repuestos, 6));
        resultado.put("reparacionesPorPeriodo", reparaciones);
        resultado.put("trabajosPorMecanico", primerosN(porMecanico, 6));
        return resultado;
    }

    private List<Map<String, Object>> primerosN(Map<String, Integer> conteos, int n) {
        return conteos.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue(Comparator.reverseOrder()))
                .limit(n)
                .map(entrada -> {
                    Map<String, Object> fila = new LinkedHashMap<>();
                    fila.put("name", entrada.getKey());
                    fila.put("value", entrada.getValue());
                    return fila;
                }).toList();
    }

    private long contarPorEstados(List<OrdenTrabajo> ordenes, String... statuses) {
        Set<String> wanted = Set.of(statuses);
        return ordenes.stream().filter(o -> o.getStatus() != null && wanted.contains(o.getStatus())).count();
    }

    private LocalDateTime inicioPeriodo(String periodo) {
        LocalDateTime now = LocalDateTime.now();
        return switch (periodo == null ? "30" : periodo.toUpperCase()) {
            case "HOY" -> now.toLocalDate().atStartOfDay();
            case "7" -> now.toLocalDate().minusDays(6).atStartOfDay();
            case "30" -> now.toLocalDate().minusDays(29).atStartOfDay();
            case "YEAR" -> LocalDate.of(now.getYear(), 1, 1).atStartOfDay();
            default -> now.toLocalDate().minusDays(29).atStartOfDay();
        };
    }

    private List<Map<String, Object>> crearSegmentos(String periodo, LocalDateTime from, LocalDateTime to) {
        String p = (periodo == null ? "30" : periodo).toUpperCase();
        DateTimeFormatter formatoDia = DateTimeFormatter.ofPattern("d MMM", new Locale("es", "PE"));
        DateTimeFormatter formatoMes = DateTimeFormatter.ofPattern("MMM", new Locale("es", "PE"));
        List<Map<String, Object>> list = new ArrayList<>();
        if ("HOY".equals(p)) {
            for (int h = 0; h < 24; h++) {
                Map<String, Object> r = new LinkedHashMap<>();
                r.put("name", String.format("%02d:00", h));
                r.put("citas", 0L);
                r.put("reparaciones", 0L);
                r.put("ingresos", 0.0);
                r.put("vehiculos", 0L);
                list.add(r);
            }
        } else if ("7".equals(p) || "30".equals(p)) {
            int days = "7".equals(p) ? 7 : 30;
            LocalDate day = from.toLocalDate();
            for (int d = 0; d < days; d++) {
                Map<String, Object> r = new LinkedHashMap<>();
                r.put("name", day.plusDays(d).format(formatoDia));
                r.put("citas", 0L);
                r.put("reparaciones", 0L);
                r.put("ingresos", 0.0);
                r.put("vehiculos", 0L);
                list.add(r);
            }
        } else {
            YearMonth ym = YearMonth.from(from);
            for (int m = 0; m < 12; m++) {
                Map<String, Object> r = new LinkedHashMap<>();
                r.put("name", ym.plusMonths(m).format(formatoMes));
                r.put("citas", 0L);
                r.put("reparaciones", 0L);
                r.put("ingresos", 0.0);
                r.put("vehiculos", 0L);
                list.add(r);
            }
        }
        return list;
    }

    private int indiceSegmento(String periodo, LocalDateTime from, LocalDateTime key) {
        if (key.isBefore(from)) return -1;
        String p = (periodo == null ? "30" : periodo).toUpperCase();
        if ("HOY".equals(p)) {
            return (int) java.time.temporal.ChronoUnit.HOURS.between(from, key);
        }
        if ("7".equals(p) || "30".equals(p)) {
            return (int) java.time.temporal.ChronoUnit.DAYS.between(from.toLocalDate(), key.toLocalDate());
        }
        return (int) java.time.temporal.ChronoUnit.MONTHS.between(YearMonth.from(from), YearMonth.from(key));
    }

    private void incrementar(Map<String, Object> fila, String key, double add) {
        Object cur = fila.get(key);
        double base = cur instanceof Number ? ((Number) cur).doubleValue() : 0;
        fila.put(key, base + add);
    }

    @SuppressWarnings("unchecked")
    private void incrementarVehiculo(Map<String, Object> fila, Long vehicleId) {
        Set<Long> set = (Set<Long>) fila.computeIfAbsent("_vehicles", k -> new java.util.HashSet<Long>());
        set.add(vehicleId);
        fila.put("vehiculos", set.size());
    }
}
