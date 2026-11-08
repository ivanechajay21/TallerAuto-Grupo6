# Auditoría de módulos y funcionalidad pendiente — SIGTM

> **Fecha:** 7 de noviembre de 2026  
> **Alcance:** frontend React, API Spring Boot, entidades, permisos, pruebas y ejecución real en Docker.  
> **Tipo:** auditoría de solo lectura; no se modificó código de producción.
>
> **Actualización 7/11/2026:** la Fase 1 de estabilización ya está implementada. Los siete endpoints que devolvían 500 ahora responden correctamente y entregan DTOs. Ver [`FASE1-COMPRAS.md`](./FASE1-COMPRAS.md).

## Veredicto

El núcleo operativo del taller está implementado y usable: dashboard, clientes, vehículos, citas, órdenes de trabajo, recepción, inventario, facturación, reportes, usuarios, roles, auditoría y configuración.

Sin embargo, el proyecto **no está completo**: existe una familia completa de módulos de compras, proveedores y abastecimiento en el backend que:

1. no tiene páginas, rutas ni servicios en el frontend;
2. tiene varios endpoints que fallan con HTTP 500 cuando se cargan datos reales;
3. tiene flujos de aprobación, presupuesto, contratos y cuentas por pagar parcialmente implementados;
4. no tiene pruebas de controlador/integración que detecten esos fallos.

No se encontraron marcadores `TODO`/`FIXME`; la incompletitud es por **integración y cobertura**, no por comentarios pendientes.

---

## 1. Resumen ejecutivo

| Indicador | Resultado |
|---|---:|
| Controladores backend | 36 |
| Controladores con UI/servicio frontend | 17 |
| Controladores sin UI | **19** |
| Endpoints de compras/abastecimiento sin UI | ~60 |
| Endpoints GET verificados con HTTP 500 real | **7** |
| Módulos backend sin pruebas de controlador | 19 |
| Pruebas backend actuales | 142 |
| Pruebas frontend actuales | 28 |

**Conclusión:** el backend tiene más alcance que el producto visible. Hoy hay dos productos distintos: el SIGTM que usa el taller desde la interfaz y una API de compras/abastecimiento que solo existe para Postman o pruebas unitarias.

---

## 2. Módulos backend sin interfaz

Estos controladores no tienen ruta en `frontend/src/App.tsx`, entrada en `Sidebar.tsx`, servicio en `frontend/src/services` ni página:

| Módulo | Controlador | Ruta base |
|---|---|---|
| Proveedores | `ProveedorController` | `/api/proveedores` |
| Analítica de proveedores | `ProveedorAnaliticaController` | `/api/abastecimiento` |
| Contratos | `ContratoProveedorController` | `/api/proveedores/{supplierId}/contratos` |
| Incidencias | `IncidenciaProveedorController` | `/api/incidencias-proveedor` |
| Compras | `CompraController` | `/api/compras` |
| Cotizaciones | `CotizacionCompraController` | `/api/cotizaciones-compra` |
| Aprobaciones | `AprobacionCompraController` | `/api/compras/aprobaciones` |
| Seguimiento logístico | `SeguimientoCompraController` | `/api/compras/{orderId}/seguimiento` |
| Inspección de recepción | `InspeccionRecepcionCompraController` | `/api/recepciones/{receiptId}/inspecciones` |
| Devoluciones | `DevolucionCompraController` | `/api/compras/{id}/devoluciones` |
| Historial de compra | `HistorialOrdenCompraController` | `/api/compras/{id}/historial` |
| Tablero de abastecimiento | `TableroAbastecimientoController` | `/api/abastecimiento/tablero` |
| Planificación | `PlanificacionAbastecimientoController` | `/api/planificacion-abastecimiento` |
| Presupuestos | `PresupuestoCompraController` | `/api/presupuestos-compras` |
| Comparador de ofertas | `ComparadorOfertasController` | `/api/abastecimiento/productos/{id}/comparacion-ofertas` |
| Reposición | `ReposicionController` | `/api/reposicion` |
| Cuentas por pagar | `CuentaPorPagarController` | `/api/cuentas-por-pagar` |
| Reportes de compras | `ReporteComprasController` | `/api/reportes/compras` |
| Exportación de compras | `ExportacionComprasController` | `/api/reportes/compras/excel` |

### Evidencia

- Rutas existentes: `frontend/src/App.tsx:89-104`.
- Navegación existente: `frontend/src/components/Sidebar.tsx:43-82`.
- Mapa de accesos: `frontend/src/lib/routeAccess.ts:3-38`.
- No existen servicios `purchaseService.ts`, `supplierService.ts`, `payableService.ts`, etc.

### Impacto

- El rol `ROLE_STOREKEEPER` recibe permisos `PROVEEDORES:VER`, `COMPRAS:VER` y `COMPRAS:RECEPCIONAR`, pero no tiene ninguna pantalla donde usarlos.
- Un rol personalizado con solo permisos de compras no tiene ruta de inicio: `getFirstAllowedRoute()` devuelve `/acceso` (`frontend/src/lib/routeAccess.ts:42-45`).
- La documentación `API.md` tampoco documenta esta familia completa.

---

## 3. Fallos críticos verificados en ejecución

### P0-1. Siete endpoints devuelven 500 con datos reales

Se creó un proveedor, una orden, una recepción, una factura de proveedor, un contrato, una incidencia, un plan y un seguimiento. Después se consultaron los listados:

| Endpoint | Resultado |
|---|---|
| `GET /api/cuentas-por-pagar` | **500** |
| `GET /api/proveedores/1/contratos` | **500** |
| `GET /api/reposicion/solicitudes` | **500** |
| `GET /api/planificacion-abastecimiento/planes` | **500** |
| `GET /api/planificacion-abastecimiento/planes/1` | **500** |
| `GET /api/incidencias-proveedor` | **500** |
| `GET /api/compras/1/seguimiento` | **500** |

**Causa confirmada en logs:**

```text
org.hibernate.LazyInitializationException:
Cannot lazily initialize collection of role
'com.sigtm.backend.model.PlanCompra.items' (no session)
```

También aparece:

```text
Could not initialize proxy [com.sigtm.backend.model.Proveedor#1] - no session
Could not initialize proxy [com.sigtm.backend.model.OrdenCompra#1] - no session
```

**Causa raíz:** los controladores devuelven entidades JPA directamente y `spring.jpa.open-in-view=false` (`backend/src/main/resources/application.yml:19`). Al serializar fuera de la transacción, las asociaciones `LAZY` no pueden inicializarse.

**Ejemplos:**

- `CuentaPorPagarController.java:21` devuelve `List<FacturaProveedor>` con `purchaseOrder` LAZY.
- `ReposicionController.java:27` devuelve `List<SolicitudCompra>` con `items` LAZY.
- `PlanificacionAbastecimientoController.java:32-34` devuelve `PlanCompra` con `items` LAZY.
- `IncidenciaProveedorController.java:19` devuelve `IncidenciaProveedor` con `supplier` y `purchaseOrder` LAZY.
- `SeguimientoCompraController.java:18` devuelve `SeguimientoCompra` con `purchaseOrder` LAZY.
- `ContratoProveedorController.java:3` devuelve `ContratoProveedor` con `supplier` LAZY.

**Corrección recomendada:** DTOs de respuesta y consultas con `@EntityGraph`/proyecciones. No activar `open-in-view` como parche.

---

### P0-2. El flujo de aprobaciones se puede saltar

- Toda orden nace `PENDIENTE_APROBACION` (`CompraService.java:53`).
- `CompraController.java:41-42` expone `POST /api/compras/{id}/aprobar` y pasa directamente a `PENDIENTE`.
- `AprobacionCompraService.decidir` no valida:
  - que el usuario tenga el rol del nivel;
  - que el monto esté dentro del rango;
  - que el mismo usuario no vote dos veces;
  - que existan niveles superiores pendientes.
- `NivelAprobacionCompra.requiredRole`, `amountFrom` y `amountTo` no se aplican en `CompraService`.

**Riesgo:** una sola persona con `COMPRAS:APROBAR` puede aprobar sin cumplir la matriz configurada.

---

### P0-3. `PoliticaReposicion` es un módulo huérfano

- `PoliticaReposicionService` existe, pero **ningún controlador lo inyecta**.
- `PoliticaReposicionRepository` solo se usa desde ese servicio.
- `ReposicionService.sugerencias()` ignora `reorderPoint`, `minimumLot`, `targetStock`, `leadTimeDays` y proveedor preferido; solo usa `currentStock <= minStock` (`ReposicionService.java:5`).

**Resultado:** las políticas de reposición se pueden guardar por código, pero no se aplican ni se pueden administrar desde la API/UI.

---

### P0-4. `topSuppliers` del tablero siempre está vacío

`TableroAbastecimientoService.java:4` devuelve:

```java
List.of()
```

El DTO espera `topSuppliers`, y el repositorio `EvaluacionProveedorRepository` está inyectado pero nunca se usa. El tablero siempre muestra `"topSuppliers":[]`.

---

## 4. Módulos parciales de alto impacto

### Cuentas por pagar

- Solo existen `GET /`, `POST /` y `POST /{id}/pagos`.
- No hay `GET /{id}` ni `GET /{id}/pagos`.
- `PagoProveedorRepository` está vacío: los pagos se guardan, pero nunca se pueden consultar.
- `CuentaPorPagarService.pagar` no valida el método de pago (`CASH`, `CARD`, `TRANSFER`).
- No usa bloqueo pesimista: dos pagos concurrentes pueden dejar saldo incorrecto.
- No permite varias facturas por orden ni facturación parcial.
- No existe anulación de factura de proveedor.

### Presupuestos

- Solo `POST /` y `GET /{periodo}`.
- El `POST` no actualiza el presupuesto existente: si el período ya existe, choca con la restricción única y devuelve 409.
- `YearMonth.parse(null)` produce 500 en vez de 400.
- `alertPercentage` no tiene rango; puede ser negativo o mayor a 100.
- No hay listado, edición real ni baja.

### Contratos

- Solo listar, crear y desactivar.
- No hay `GET /{id}`, `PUT` ni reactivación.
- `ContratoProveedorService.crear` llama `data.getEndsAt().isBefore(...)` sin validar nulos: un contrato incompleto produce 500.
- `currency`, `discountPercentage`, `paymentDays` y `minimumPurchase` son `nullable=false`, pero no tienen `@NotNull`; el error termina en 409.
- Los términos del contrato (`discountPercentage`, `paymentDays`, `minimumPurchase`, `terms`) nunca se leen para aplicarlos a una orden o factura.

### Inspecciones de recepción

- Suma `acceptedQuantity + rejectedQuantity` sin validar nulos.
- No valida que la suma no supere la cantidad recibida.
- No verifica que el producto pertenezca a la recepción.
- No actualiza la recepción/orden ni registra auditoría.
- El controlador no usa `@Valid`.

### Seguimiento logístico

- Permite transiciones hacia atrás (`ENTREGADA → ENVIADA`).
- Permite `ENTREGADA` sin fecha de llegada real.
- Permite seguimiento sobre órdenes `ANULADA` o cotizaciones porque no valida el estado de la orden.

### Reportes de compras

- `resumen()` y `porProveedor()` solo excluyen `ANULADA`; suman también `COTIZACION` y `RECHAZADA` (`ReporteComprasService.java:25,36`).
- `PresupuestoCompraService.estado` comete el mismo error al calcular comprometido.
- `vencimientos` y `costos` devuelven `ResponseEntity<?>` aunque existen DTOs específicos.

### Precios de proveedor

- El repositorio filtra solo `active=true`; no filtra `validFrom`/`validUntil`.
- El comparador y las tendencias pueden recomendar precios caducados.

---

## 5. Problemas de roles y permisos en el frontend

### Roles

- `Roles.tsx:36` solo muestra `VER`, `CREAR`, `EDITAR`, `ELIMINAR`, `EXPORTAR`, `APROBAR`, `ASIGNAR`, `CAMBIAR_ESTADO`.
- Faltan `RECEPCIONAR`, `ANULAR` y `DEVOLVER`, que el backend sí define en `DataInitializer`.
- `MODULE_LABELS` no incluye `SUPPLIERS` ni `PURCHASES`; se muestran como texto crudo.
- Un administrador no puede conceder ni revocar los permisos de recepción/anulación/devolución desde la UI.

### Usuarios

- `Users.tsx:12-20` tiene los roles hardcodeados.
- `Roles.tsx` permite crear roles personalizados, pero `Users.tsx` no los carga desde `roleService`.
- Consecuencia: un rol nuevo no se puede asignar a ningún usuario.

### Gating de permisos

Hay acciones visibles que el backend rechaza con 403:

| Pantalla | Acción | Permiso backend |
|---|---|---|
| Clientes | Crear/editar | `CLIENTES:CREAR` / `CLIENTES:EDITAR` |
| Vehículos | Crear/editar | `VEHICULOS:CREAR` / `VEHICULOS:EDITAR` |
| Citas | Crear/confirmar/cancelar/generar orden | `CITAS:CREAR`, `CITAS:CAMBIAR_ESTADO`, `ORDENES:CREAR` |
| Recepción | Emitir orden | `RECEPCION:CREAR` |
| Usuarios | Guardar/cambiar estado | `USUARIOS:EDITAR` / `USUARIOS:CAMBIAR_ESTADO` |
| Roles | Crear/editar/eliminar/asignar | `hasRole('ADMIN')` |
| Mi trabajo | Cambiar estado | `MI_TRABAJO:CAMBIAR_ESTADO` |

Clientes y Vehículos solo protegen el botón de eliminar. Citas no importa `hasPermission`. Roles no comprueba rol ADMIN.

---

## 6. Otros módulos visibles incompletos

| Módulo | Situación |
|---|---|
| Facturación | Existe filtro “Anuladas” y estado `CANCELLED`, pero no hay endpoint ni acción de anulación. El filtro siempre estará vacío. |
| Órdenes de trabajo | El botón “Nueva Recepción” navega a `/recepcion` (listado), no a `/recepcion/nueva`. No hay alta directa de OT ni eliminación de OT. |
| Recepción | No hay edición ni eliminación; backend tampoco las expone. |
| Citas | No hay edición ni eliminación; backend tampoco las expone. |
| Usuarios | No hay eliminación; backend tampoco la expone. |
| Catálogo de servicios | No hay eliminación; backend tampoco la expone. |
| Auditoría | Existe permiso `AUDITORIA:EXPORTAR`, pero no hay botón ni endpoint de exportación. |
| Contratos | Términos comerciales no se aplican al flujo de compras. |
| Presupuestos | No se pueden listar ni editar correctamente. |
| Cuentas por pagar | No se pueden consultar pagos ni anular facturas. |
| Compras | El flujo de aprobación no respeta niveles ni roles. |

---

## 7. Código muerto o datos huérfanos

- `PoliticaReposicionService` sin controlador.
- `PagoProveedorRepository` sin lectura.
- `HistorialSolicitudCompra.changedBy` nunca se asigna.
- `ReposicionService.convertirEnOrden` no crea historial de solicitud.
- `PresupuestoCompra.active` y `NivelAprobacionCompra.active` nunca se desactivan.
- `EvaluacionProveedorRepository` inyectado y no usado en el tablero.
- `IncidenciaProveedorRepository.findBySupplierId...` sin uso.
- `ProductoRepository.findByCurrentStockLessThanEqualAndActiveTrue` sin uso.
- `ClienteSeguridadTest.java` está vacío.
- `exportReportPdf`, `exportReportExcel`, `getDashboardMetrics`, `getMonthlyRevenue`, `getTopServices` y varios `getById` no se usan en la UI actual.
- `DEFAULT_ISSUER` en `invoiceFormat.ts` contiene RUC/teléfono/correo ficticios de respaldo.

---

## 8. Cobertura de pruebas

- El backend tiene **142 pruebas** y el frontend **28**.
- Los 19 controladores de compras/abastecimiento **no tienen `@WebMvcTest` ni pruebas de integración**.
- `CompraServiceTest` solo cubre `crear`; no cubre recepción, devolución, anulación, aprobación, historial ni seguimiento.
- No hay pruebas que serialicen entidades reales; por eso los 500 por `LazyInitializationException` no se detectaron.
- Sin pruebas: `TableroAbastecimientoService`, `InspeccionRecepcionCompraService`, `ExportacionComprasService`, `ProveedorAnaliticaService`, `ProveedorService`, `PoliticaReposicionService`.

---

## 9. Prioridad recomendada

### Fase 1 — estabilizar antes de exponer

1. Crear DTOs de respuesta para compras, proveedores, contratos, cuentas por pagar, reposición, planificación, incidencias y seguimiento.
2. Añadir `@EntityGraph` o consultas de proyección para los listados.
3. Añadir pruebas de controlador/integración que serialicen respuestas con datos reales.
4. Corregir validaciones nulas en contratos, presupuestos e inspecciones.

### Fase 2 — completar flujos

5. Conectar niveles de aprobación con monto/rol y bloquear el endpoint directo de aprobación.
6. Completar cuentas por pagar: consulta de pagos, bloqueo pesimista, métodos válidos, anulación.
7. Completar presupuestos: listado, upsert real, validación de porcentaje.
8. Completar contratos: detalle, edición, reactivación y aplicación de términos.
9. Aplicar `PoliticaReposicion` en las sugerencias de reposición.
10. Calcular `topSuppliers` en el tablero.

### Fase 3 — integrar en la aplicación

11. Crear servicios frontend y páginas para proveedores, compras, aprobaciones, cuentas por pagar, presupuestos, contratos y abastecimiento.
12. Añadir rutas, menú y `HOME_ROUTES`.
13. Completar matriz de Roles y roles dinámicos en Usuarios.
14. Aplicar gating de permisos en Clientes, Vehículos, Citas, Recepción, Usuarios, Roles y Mi Trabajo.
15. Implementar o retirar el estado `CANCELLED` de facturación.
16. Corregir la navegación de “Nueva Recepción” y valorar el alta directa de OT.

---

## 10. Evidencia de ejecución

Datos de auditoría creados en el entorno local:

- Proveedor: `Proveedor Auditoria SAC`
- Orden: `OC-64FF30FB`
- Recepción: `RC-C8C6EAD2`
- Factura de proveedor: `F001-AUD-1`
- Contrato: `CP-354878A7`
- Incidencia de calidad
- Plan de compra `PC-202611-823F34`
- Seguimiento en tránsito

Estos registros explican los 500 reproducidos y quedan en la base local para futuras pruebas.
