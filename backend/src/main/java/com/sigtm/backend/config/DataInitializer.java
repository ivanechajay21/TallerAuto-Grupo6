package com.sigtm.backend.config;

import com.sigtm.backend.model.ItemCatalogo;
import com.sigtm.backend.model.MovimientoInventario;
import com.sigtm.backend.model.Permiso;
import com.sigtm.backend.model.Producto;
import com.sigtm.backend.model.Rol;
import com.sigtm.backend.model.ServicioCatalogo;
import com.sigtm.backend.model.Configuracion;
import com.sigtm.backend.model.Usuario;
import com.sigtm.backend.repository.ItemCatalogoRepository;
import com.sigtm.backend.repository.MovimientoInventarioRepository;
import com.sigtm.backend.repository.PermisoRepository;
import com.sigtm.backend.repository.ProductoRepository;
import com.sigtm.backend.repository.RolRepository;
import com.sigtm.backend.repository.ServicioCatalogoRepository;
import com.sigtm.backend.repository.ConfiguracionRepository;
import com.sigtm.backend.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Inicializador de datos iniciales de la aplicación.
 *
 * <p>Se ejecuta al arrancar la aplicación y siembra, de forma idempotente,
 * los datos básicos necesarios para que el sistema sea operable: roles y
 * usuarios por defecto, catálogo de permisos y su asignación a los roles,
 * catálogo de servicios, productos de inventario, configuración del taller y
 * catálogos del sistema (categorías, estados, prioridades y unidades).</p>
 *
 * <p>Cada siembra comprueba primero si el registro ya existe, por lo que
 * arrancar la aplicación varias veces no duplica información ni sobrescribe
 * los cambios realizados desde la interfaz.</p>
 */
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    @Value("${app.seed.enabled:false}")
    private boolean seedEnabled;

    private final UsuarioRepository userRepository;
    private final RolRepository roleRepository;
    private final ServicioCatalogoRepository serviceCatalogRepository;
    private final PermisoRepository permissionRepository;
    private final ConfiguracionRepository settingsRepository;
    private final ItemCatalogoRepository catalogItemRepository;
    private final ProductoRepository productRepository;
    private final MovimientoInventarioRepository transactionRepository;
    private final PasswordEncoder passwordEncoder;

    private record RolSpec(String name, String description) {}

    /**
     * Permisos de catálogo iniciales por rol de sistema (coherentes con la autorización
     * por permiso que exigen los controllers vía @PreAuthorize("hasAuthority(...)") y con
     * la matriz de Roles y Permisos del frontend). ADMIN y MANAGER reciben el catálogo
     * completo; los demás roles, solo lo que aparece aquí.
     */
    private static final java.util.Map<String, java.util.Set<String>> PERMISOS_POR_ROL = java.util.Map.of(
            "ROLE_RECEPTIONIST", java.util.Set.of(
                    "DASHBOARD:VER", "NOTIFICACIONES:VER",
                    "CLIENTES:VER", "CLIENTES:CREAR", "CLIENTES:EDITAR",
                    "VEHICULOS:VER", "VEHICULOS:CREAR", "VEHICULOS:EDITAR",
                    "CITAS:VER", "CITAS:CREAR", "CITAS:CAMBIAR_ESTADO",
                    "ORDENES:VER", "ORDENES:CREAR", "ORDENES:EDITAR", "ORDENES:CAMBIAR_ESTADO",
                    "ITEMS:VER", "ITEMS:CREAR", "ITEMS:EDITAR", "ITEMS:ELIMINAR", "ITEMS:CAMBIAR_ESTADO",
                    "RECEPCION:VER", "RECEPCION:CREAR",
                    "PRODUCTOS:VER",
                    "FACTURAS:VER", "FACTURAS:CREAR",
                    "REPORTES:VER"),
            "ROLE_MECHANIC", java.util.Set.of(
                    "NOTIFICACIONES:VER",
                    "MI_TRABAJO:VER", "MI_TRABAJO:CAMBIAR_ESTADO",
                    "PRODUCTOS:VER"),
            "ROLE_STOREKEEPER", java.util.Set.of(
                    "NOTIFICACIONES:VER",
                    "PRODUCTOS:VER",
                    "MOVIMIENTOS:VER", "MOVIMIENTOS:CREAR"));

    /**
     * Ejecuta la siembra de todos los datos iniciales del sistema.
     *
     * @param args Argumentos de línea de comandos recibidos al arrancar;
     *             no se utilizan.
     */
    @Override
    @Transactional
    public void run(String... args) {
        if (!seedEnabled) {
            return;
        }
        Map<String, Rol> roles = seedRoles();

        seedUsers(roles);
        seedServiceCatalog();
        seedProducts();
        seedPermissions(roles);
        seedSettings();
        seedSystemCatalogs();
    }

    private Map<String, Rol> seedRoles() {
        Map<String, Rol> roles = new LinkedHashMap<>();
        for (RolSpec spec : new RolSpec[]{
                new RolSpec("ROLE_ADMIN", "Administrador con acceso total"),
                new RolSpec("ROLE_MANAGER", "Gerente / Propietario"),
                new RolSpec("ROLE_RECEPTIONIST", "Recepcionista"),
                new RolSpec("ROLE_MECHANIC", "Mecánico"),
                new RolSpec("ROLE_STOREKEEPER", "Almacenero")}) {
            roles.put(spec.name(), roleRepository.findByName(spec.name()).orElseGet(() -> {
                Rol role = new Rol();
                role.setName(spec.name());
                role.setDescription(spec.description());
                return roleRepository.save(role);
            }));
        }
        return roles;
    }

    private void seedUsers(Map<String, Rol> roles) {
        seedUser("admin", "admin123", "Admin", "System", roles.get("ROLE_ADMIN"));
        seedUser("gerente", "gerente123", "Gerente", "Taller", roles.get("ROLE_MANAGER"));
        seedUser("recepcion", "recepcion123", "Recepcionista", "Taller", roles.get("ROLE_RECEPTIONIST"));
        seedUser("mecanico", "mecanico123", "Mecánico", "Taller", roles.get("ROLE_MECHANIC"));
        seedUser("almacen", "almacen123", "Almacenero", "Taller", roles.get("ROLE_STOREKEEPER"));
    }

    private void seedUser(String username, String password, String name, String lastName, Rol role) {
        if (userRepository.findByUsername(username).isEmpty()) {
            Usuario user = new Usuario();
            user.setUsername(username);
            user.setEmail(username + "@tallerauto.com");
            user.setPassword(passwordEncoder.encode(password));
            user.setName(name);
            user.setLastName(lastName);
            user.setActive(true);
            user.setRole(role);
            userRepository.save(user);
            System.out.println("Usuario creado: " + username + " / " + password);
        }
    }

    private record SubmoduleSpec(String module, String code, String label, String... actions) {}

    private void seedPermissions(Map<String, Rol> roles) {
        List<SubmoduleSpec> specs = new ArrayList<>(List.of(
                new SubmoduleSpec("DASHBOARD", "DASHBOARD", "Dashboard", "VER"),
                new SubmoduleSpec("NOTIFICATIONS", "NOTIFICACIONES", "Notificaciones", "VER"),
                new SubmoduleSpec("CUSTOMERS", "CLIENTES", "Clientes", "VER", "CREAR", "EDITAR", "ELIMINAR", "EXPORTAR"),
                new SubmoduleSpec("VEHICLES", "VEHICULOS", "Vehículos", "VER", "CREAR", "EDITAR", "ELIMINAR", "EXPORTAR"),
                new SubmoduleSpec("APPOINTMENTS", "CITAS", "Citas", "VER", "CREAR", "EDITAR", "ELIMINAR", "CAMBIAR_ESTADO"),
                new SubmoduleSpec("WORK_ORDERS", "ORDENES", "Órdenes", "VER", "CREAR", "EDITAR", "ELIMINAR", "EXPORTAR", "APROBAR", "ASIGNAR", "CAMBIAR_ESTADO"),
                new SubmoduleSpec("WORK_ORDERS_ITEMS", "ITEMS", "Ítems", "VER", "CREAR", "EDITAR", "ELIMINAR", "CAMBIAR_ESTADO"),
                new SubmoduleSpec("RECEPTION", "RECEPCION", "Recepción", "VER", "CREAR", "EDITAR", "CAMBIAR_ESTADO"),
                new SubmoduleSpec("MY_WORK", "MI_TRABAJO", "Mi trabajo", "VER", "EDITAR", "CAMBIAR_ESTADO"),
                new SubmoduleSpec("INVENTORY", "PRODUCTOS", "Productos", "VER", "CREAR", "EDITAR", "ELIMINAR", "EXPORTAR"),
                new SubmoduleSpec("INVENTORY_MOVS", "MOVIMIENTOS", "Movimientos", "VER", "CREAR", "EXPORTAR"),
                new SubmoduleSpec("BILLING", "FACTURAS", "Facturas", "VER", "CREAR", "EDITAR", "ELIMINAR", "EXPORTAR", "APROBAR"),
                new SubmoduleSpec("BILLING_QUOTES", "COTIZACIONES", "Cotizaciones", "VER", "CREAR", "EDITAR", "ELIMINAR", "EXPORTAR", "APROBAR"),
                new SubmoduleSpec("REPORTS", "REPORTES", "Reportes", "VER", "EXPORTAR"),
                new SubmoduleSpec("AUDIT", "AUDITORIA", "Auditoría", "VER", "EXPORTAR"),
                new SubmoduleSpec("CONFIG", "CONFIGURACION", "Configuración", "VER", "EDITAR"),
                new SubmoduleSpec("USERS", "USUARIOS", "Usuarios", "VER", "CREAR", "EDITAR", "ELIMINAR", "EXPORTAR", "ASIGNAR", "CAMBIAR_ESTADO"),
                new SubmoduleSpec("ROLES", "ROLES", "Roles y permisos", "VER", "CREAR", "EDITAR", "ELIMINAR", "ASIGNAR")
        ));

        Map<String, String> actionLabels = Map.of(
                "VER", "Ver",
                "CREAR", "Crear",
                "EDITAR", "Editar",
                "ELIMINAR", "Eliminar",
                "EXPORTAR", "Exportar",
                "APROBAR", "Aprobar",
                "ASIGNAR", "Asignar",
                "CAMBIAR_ESTADO", "Cambiar estado");

        java.util.Set<String> catalogCodes = new java.util.HashSet<>();
        List<Permiso> createdNow = new ArrayList<>();
        for (SubmoduleSpec spec : specs) {
            for (String action : spec.actions()) {
                String code = spec.code() + ":" + action;
                catalogCodes.add(code);
                if (permissionRepository.findByCode(code).isEmpty()) {
                    Permiso p = Permiso.builder()
                            .code(code)
                            .module(spec.module())
                            .submodule(spec.label())
                            .action(action)
                            .name(actionLabels.get(action) + " " + spec.label().toLowerCase(java.util.Locale.ROOT) + " (" + spec.module().toLowerCase() + " - " + code + ")")
                            .build();
                    permissionRepository.save(p);
                    createdNow.add(p);
                }
            }
        }

        // Limpieza de permisos huérfanos (de catálogos anteriores).
        List<Permiso> orphans = permissionRepository.findAll().stream()
                .filter(p -> !catalogCodes.contains(p.getCode()))
                .toList();
        orphans.forEach(orphan -> {
            roleRepository.findAll().forEach(role -> {
                if (role.getPermissions() != null) {
                    role.getPermissions().remove(orphan);
                    roleRepository.save(role);
                }
            });
            permissionRepository.delete(orphan);
        });

        // Asignación de permisos a los roles del sistema:
        //  - Roles nuevos/vacíos reciben el catálogo según su matriz (PERMISOS_POR_ROL);
        //    ADMIN y MANAGER reciben el catálogo completo.
        //  - Los permisos recién creados en este arranque se otorgan solo a ADMIN y MANAGER;
        //    los demás roles los reciben únicamente si el administrador los asigna desde la UI.
        //  - CONFIGURACIÓN se entrega por defecto solo a ADMIN y MANAGER (única vez, al crearse
        //    los permisos); lo anterior evita pisar restricciones hechas por el administrador.
        List<Permiso> full = permissionRepository.findAll();
        boolean configJustCreated = createdNow.stream()
                .anyMatch(p -> p.getCode() != null && p.getCode().startsWith("CONFIGURACION:"));
        roles.values().forEach(role -> {
            boolean fresh = role.getPermissions() == null || role.getPermissions().isEmpty();
            if (fresh) {
                if ("ROLE_ADMIN".equals(role.getName()) || "ROLE_MANAGER".equals(role.getName())) {
                    role.setPermissions(new java.util.HashSet<>(full));
                } else {
                    java.util.Set<String> codes = PERMISOS_POR_ROL.getOrDefault(role.getName(), java.util.Set.of());
                    role.setPermissions(new java.util.HashSet<>(
                            full.stream()
                                    .filter(p -> p.getCode() != null && codes.contains(p.getCode()))
                                    .toList()));
                }
            }
            if (!createdNow.isEmpty()
                    && ("ROLE_ADMIN".equals(role.getName()) || "ROLE_MANAGER".equals(role.getName()))) {
                role.getPermissions().addAll(createdNow);
            }
            if (configJustCreated
                    && !"ROLE_ADMIN".equals(role.getName())
                    && !"ROLE_MANAGER".equals(role.getName())) {
                role.getPermissions().removeIf(p -> p.getCode() != null && p.getCode().startsWith("CONFIGURACION:"));
            }
            roleRepository.save(role);
        });
    }

    private void seedServiceCatalog() {
        Map<String, Object[]> services = new LinkedHashMap<>();
        services.put("SRV-ACEITE", new Object[]{"Cambio de aceite y filtro", "Mantenimiento", "45", "90"});
        services.put("SRV-FRENOS", new Object[]{"Cambio de frenos / pastillas", "Frenos", "350", "120"});
        services.put("SRV-DISCOS", new Object[]{"Cambio de discos de freno", "Frenos", "420", "150"});
        services.put("SRV-BATERIA", new Object[]{"Cambio de batería", "Eléctrico", "260", "60"});
        services.put("SRV-LLANTAS", new Object[]{"Cambio de llantas", "Suspensión", "180", "90"});
        services.put("SRV-MOTOR", new Object[]{"Reparación de motor", "Motor", "1200", "480"});
        services.put("SRV-TRANSMISION", new Object[]{"Reparación de transmisión", "Transmisión", "1500", "600"});
        services.put("SRV-ELECTRICO", new Object[]{"Reparación eléctrica", "Eléctrico", "300", "180"});
        services.put("SRV-SUSPENSION", new Object[]{"Sistema de suspensión", "Suspensión", "450", "150"});
        services.put("SRV-ALINEACION", new Object[]{"Alineación", "Alineación", "120", "60"});
        services.put("SRV-BALANCEO", new Object[]{"Balanceo de ruedas", "Alineación", "80", "45"});
        services.put("SRV-DIAGNOSTICO", new Object[]{"Diagnóstico general", "Diagnóstico", "150", "45"});
        services.put("SRV-MANT-PREV", new Object[]{"Mantenimiento preventivo", "Mantenimiento", "250", "120"});
        services.put("SRV-MANT-CORR", new Object[]{"Mantenimiento correctivo", "Mantenimiento", "500", "240"});
        services.put("SRV-OTRO", new Object[]{"Otros servicios", "General", "100", "60"});

        for (Map.Entry<String, Object[]> entry : services.entrySet()) {
            if (serviceCatalogRepository.findByCode(entry.getKey()).isEmpty()) {
                Object[] s = entry.getValue();
                ServicioCatalogo service = ServicioCatalogo.builder()
                        .code(entry.getKey())
                        .name((String) s[0])
                        .category((String) s[1])
                        .defaultPrice(new BigDecimal((String) s[2]))
                        .estimatedDurationMinutes(Integer.parseInt((String) s[3]))
                        .active(true)
                        .build();
                serviceCatalogRepository.save(service);
            }
        }
    }

    private void seedProducts() {
        if (productRepository.count() > 0) return;

        Usuario admin = userRepository.findByUsername("admin").orElse(null);

        // código: [nombre, marca, categoria, precio compra, precio venta, stock, stock min]
        Map<String, Object[]> products = new LinkedHashMap<>();
        products.put("ACE-5W30", new Object[]{"Aceite Sintético 5W-30", "Castrol", "Aceites", "95.00", "120.00", 15, 5});
        products.put("FIL-AC-01", new Object[]{"Filtro de Aceite", "Bosch", "Filtros", "15.00", "25.50", 3, 10});
        products.put("PAS-FR-DEL", new Object[]{"Pastillas de Freno Delanteras", "Brembo", "Frenos", "120.00", "180.00", 8, 4});
        products.put("BUF-PAR-00", new Object[]{"Bujías NGK", "NGK", "Eléctrico", "10.00", "18.00", 24, 6});
        products.put("LIQ-FRE-01", new Object[]{"Líquido de Freno DOT 4", "Bosch", "Frenos", "25.00", "45.00", 2, 8});

        for (Map.Entry<String, Object[]> entry : products.entrySet()) {
            Object[] v = entry.getValue();
            Producto product = Producto.builder()
                    .code(entry.getKey())
                    .name((String) v[0])
                    .brand((String) v[1])
                    .category((String) v[2])
                    .purchasePrice(new BigDecimal((String) v[3]))
                    .salePrice(new BigDecimal((String) v[4]))
                    .currentStock((Integer) v[5])
                    .minStock((Integer) v[6])
                    .active(true)
                    .build();
            Producto saved = productRepository.save(product);

            if (admin != null && saved.getCurrentStock() != null && saved.getCurrentStock() > 0) {
                transactionRepository.save(MovimientoInventario.builder()
                        .product(saved)
                        .type("IN")
                        .quantity(saved.getCurrentStock())
                        .unitPrice(saved.getPurchasePrice())
                        .reference("Ajuste inicial")
                        .user(admin)
                        .build());
            }
        }
        System.out.println("Productos de inventario creados: " + products.size());
    }

    private void seedSettings() {
        if (settingsRepository.count() == 0) {
            settingsRepository.save(Configuracion.builder()
                    .tallerNombre("Mi Taller Mecánico")
                    .correoTipo("GMAIL")
                    .smtpSeguridad("STARTTLS")
                    .smtpPuerto(587)
                    .notifConfirmacionCita(true)
                    .notifRecordatorio(true)
                    .notifVehiculoListo(true)
                    .notifAlertasInventario(true)
                    .build());
        }
    }

    private void seedSystemCatalogs() {
        if (catalogItemRepository.count() > 0) return;

        seedCatalog("CATEGORIA", null, "Aceites", 1);
        seedCatalog("CATEGORIA", null, "Filtros", 2);
        seedCatalog("CATEGORIA", null, "Frenos", 3);
        seedCatalog("CATEGORIA", null, "Suspensión", 4);
        seedCatalog("CATEGORIA", null, "Eléctrico", 5);
        seedCatalog("CATEGORIA", null, "Lubricantes", 6);

        seedCatalog("ESTADO", "RECIBIDO", "Recibido", 1);
        seedCatalog("ESTADO", "EN_DIAGNOSTICO", "En diagnóstico", 2);
        seedCatalog("ESTADO", "DIAGNOSTICO_REALIZADO", "Diagnóstico realizado", 3);
        seedCatalog("ESTADO", "PENDIENTE_APROBACION", "Pendiente de aprobación", 4);
        seedCatalog("ESTADO", "EN_REPARACION", "En reparación", 5);
        seedCatalog("ESTADO", "PAUSADO", "En espera de repuestos", 6);
        seedCatalog("ESTADO", "LISTO_PARA_ENTREGA", "Listo para entrega", 7);
        seedCatalog("ESTADO", "FINALIZADO", "Finalizado / entregado", 8);

        seedCatalog("PRIORIDAD", "NORMAL", "Normal", 1);
        seedCatalog("PRIORIDAD", "ALTA", "Alta", 2);
        seedCatalog("PRIORIDAD", "URGENTE", "Urgente", 3);

        seedCatalog("UNIDAD", null, "Unidad", 1);
        seedCatalog("UNIDAD", null, "Caja", 2);
        seedCatalog("UNIDAD", null, "Par", 3);
        seedCatalog("UNIDAD", null, "Kit", 4);
        seedCatalog("UNIDAD", null, "Litro", 5);
        seedCatalog("UNIDAD", null, "Kilogramo", 6);
        seedCatalog("UNIDAD", null, "Servicio", 7);
    }

    private void seedCatalog(String tipo, String code, String nombre, int orden) {
        catalogItemRepository.save(ItemCatalogo.builder()
                .tipo(tipo)
                .code(code)
                .nombre(nombre)
                .orden(orden)
                .activo(true)
                .build());
    }
}
