# Fase 1 — Estabilización de compras y abastecimiento

> **Fecha:** 7 de noviembre de 2026
>
> **Objetivo:** eliminar los HTTP 500 por serialización, separar entidades de la API, agregar validaciones y cubrir los endpoints con pruebas reales antes de construir la UI.

## Resultado

| Antes | Después |
|---|---|
| 7 endpoints GET devolvían 500 con datos reales | Los 7 devuelven **200** |
| 19 controladores devolvían entidades JPA | Los listados críticos devuelven DTOs |
| Contratos/presupuestos aceptaban nulos y terminaban en 500/409 | Devuelven **400** con mensaje claro |
| Sin pruebas de serialización | Prueba de integración con MySQL real |

## Qué se implementó

### 1. DTOs de respuesta

Se creó `backend/src/main/java/com/sigtm/backend/dto/ComprasResponses.java` con:

- `ProveedorResumen`
- `ProductoResumen`
- `OrdenResumen`
- `RecepcionResumen`
- `PagoProveedorResponse`
- `FacturaProveedorResponse`
- `ContratoProveedorResponse`
- `SolicitudCompraResponse` + ítems
- `PronosticoDemandaResponse`
- `PlanCompraResponse` + ítems
- `IncidenciaProveedorResponse`
- `SeguimientoCompraResponse`
- `InspeccionRecepcionCompraResponse`
- `DevolucionCompraResponse` + ítems
- `NivelAprobacionCompraResponse`
- `AprobacionOrdenCompraResponse`

El mapeo se hace **dentro de la transacción del servicio**, por lo que ninguna asociación `LAZY` llega al serializador.

### 2. Endpoints corregidos

| Endpoint | Resultado |
|---|---|
| `GET /api/cuentas-por-pagar` | 200 con orden y pagos |
| `GET /api/cuentas-por-pagar/{id}` | 200 |
| `GET /api/cuentas-por-pagar/{id}/pagos` | 200 |
| `GET /api/proveedores/{id}/contratos` | 200 |
| `GET /api/reposicion/solicitudes` | 200 con ítems |
| `GET /api/planificacion-abastecimiento/planes` | 200 con ítems |
| `GET /api/planificacion-abastecimiento/planes/{id}` | 200 con ítems |
| `GET /api/planificacion-abastecimiento/pronosticos` | 200 con producto |
| `GET /api/incidencias-proveedor` | 200 con proveedor y orden |
| `GET /api/compras/{id}/seguimiento` | 200 con orden |
| `GET /api/compras/{id}/devoluciones` | 200 con ítems |
| `GET /api/compras/aprobaciones/niveles` | 200 |
| `GET /api/compras/aprobaciones/orden/{id}` | 200 |

### 3. Cuentas por pagar

- Se agregó consulta de pagos por factura.
- El pago usa `findByIdForUpdate` con bloqueo pesimista.
- Se valida método de pago: `CASH`, `CARD` o `TRANSFER`.
- Se valida monto mayor a cero y que no supere el saldo.
- Se valida que la fecha de vencimiento no sea anterior a la emisión.
- Se valida que el total no supere el total de la orden.

### 4. Contratos y presupuestos

- Contratos: validación `@NotNull` de fechas, moneda, descuento, días de pago y compra mínima.
- Presupuestos: upsert real por período, validación de formato `AAAA-MM`, límite positivo y alerta entre 0 y 100.
- Se agregó `GET /api/proveedores/{supplierId}/contratos/{id}`.

### 5. Inspecciones y seguimiento

- Inspección: valida cantidades nulas, cantidades negativas, suma superior a la recibida y producto perteneciente a la recepción.
- Inspección: registra auditoría.
- Seguimiento: impide retrocesos, exige fecha real al marcar `ENTREGADA` y rechaza órdenes que no admiten seguimiento.

### 6. Reportes de compras

- El comprometido solo suma estados de compra efectivos:
  - `PENDIENTE_APROBACION`
  - `PENDIENTE`
  - `PARCIAL`
  - `RECIBIDA`
- Se excluyen `COTIZACION`, `RECHAZADA` y `ANULADA`.

## Pruebas

- Suite backend: **152 pruebas, 0 fallos**.
- Nueva prueba `ComprasSerializationIntegrationTest` con MySQL real y Testcontainers:
  - crea proveedor, producto, orden, factura, pago, contrato, solicitud, pronóstico, plan, incidencia y seguimiento;
  - ejecuta los GET sin `@Transactional`;
  - verifica que las respuestas contienen las asociaciones esperadas.
- Pruebas unitarias agregadas para:
  - método de pago inválido;
  - contrato con fechas nulas;
  - presupuesto upsert y período inválido;
  - seguimiento sin fecha de entrega y retroceso de estado;
  - inspección con cantidad excedida y producto ajeno.

## Verificación en vivo

Con los datos de auditoría creados previamente:

```text
GET /api/cuentas-por-pagar                         200
GET /api/cuentas-por-pagar/1/pagos                 200
GET /api/proveedores/1/contratos                   200
GET /api/reposicion/solicitudes                    200
GET /api/planificacion-abastecimiento/planes       200
GET /api/planificacion-abastecimiento/planes/1     200
GET /api/incidencias-proveedor                     200
GET /api/compras/1/seguimiento                     200
```

Validaciones en vivo:

```text
Contrato incompleto                        400
Presupuesto con período inválido           400
Inspección con cantidad excedida           400
Incidencia sin descripción                 400
Seguimiento ENTREGADA sin fecha            400
```

## Pendiente para Fase 2

1. Conectar niveles de aprobación con monto/rol y eliminar el bypass de aprobación directa.
2. Aplicar `PoliticaReposicion` en las sugerencias.
3. Calcular `topSuppliers` del tablero.
4. Completar edición/reactivación de contratos.
5. Aplicar términos de contrato a órdenes/facturas.
6. Completar anulación de facturas de proveedor y facturación parcial.
7. Crear la UI de compras/proveedores/abastecimiento.
