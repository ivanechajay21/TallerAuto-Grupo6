# Fase 2 — Aprobaciones, contratos, reposición y facturación de proveedor

> **Fecha:** 8 de noviembre de 2026
>
> **Objetivo:** completar los flujos de negocio que quedaron pendientes después de estabilizar las respuestas de compras.

## Resultado

| Flujo | Antes | Ahora |
|---|---|---|
| Aprobación de compras | Se podía aprobar directamente y no se aplicaban niveles | Niveles por monto/rol, sin bypass y con voto único |
| Contratos | Solo crear/desactivar; términos ignorados | Editar, reactivar, mínimo de compra y descuento aplicados |
| Reposición | `PoliticaReposicion` huérfana | Endpoint de políticas y sugerencias basadas en política |
| Tablero | `topSuppliers` siempre vacío | Ranking por evaluación de proveedores |
| Facturas de proveedor | Una factura por orden y sin anulación | Facturación parcial acumulada y anulación sin pagos |

## 1. Aprobaciones multinivel

- `CompraService` determina si una orden requiere aprobación según su total y los niveles activos.
- Si ningún nivel aplica, la orden pasa directamente a `PENDIENTE`.
- Se eliminó el endpoint directo `POST /api/compras/{id}/aprobar`.
- `AprobacionCompraService` ahora valida:
  - que el nivel esté activo;
  - que el monto de la orden esté en el rango del nivel;
  - que el rol del usuario coincida con `requiredRole` o sea `ROLE_ADMIN`;
  - que el usuario no haya votado antes en ese nivel;
  - que todos los niveles aplicables hayan alcanzado su mínimo de aprobaciones.
- Un rechazo deja la orden en `RECHAZADA`.

Verificado en vivo:

```text
POST /api/compras/2/aprobar                             404
POST /api/compras/aprobaciones/orden/2/nivel/1?decision=APROBADA 200
GET  /api/compras/2                                     status PENDIENTE
POST misma aprobación otra vez                          400
```

## 2. Contratos

- Nuevo `GET /api/proveedores/{supplierId}/contratos/{id}`.
- Nuevo `PUT /api/proveedores/{supplierId}/contratos/{id}`.
- Nuevo `PATCH /api/proveedores/{supplierId}/contratos/{id}/reactivar`.
- El contrato se valida contra el proveedor indicado.
- `CompraService` busca el contrato vigente y aplica:
  - compra mínima;
  - descuento porcentual sobre el total.

Verificado en vivo:

```text
Contrato actualizado                        200
Contrato reactivado                         200
Orden bajo compra mínima                    400
Orden de 120 con 5 % de descuento           total 114.00
```

## 3. Política de reposición

- Nuevo controlador `PoliticaReposicionController`.
- Endpoints:
  - `GET /api/reposicion/politicas`
  - `PUT /api/reposicion/politicas/producto/{productId}?supplierId=...`
- `ReposicionService.sugerencias()` usa:
  - punto de reorden;
  - lote mínimo;
  - stock objetivo;
  - plazo de entrega;
  - proveedor preferido.
- Se devuelve `policyApplied` y los datos de la política en la sugerencia.

Verificado en vivo:

```text
PUT /api/reposicion/politicas/producto/2?supplierId=1 200
GET /api/reposicion/sugerencias
  → productId 2, currentStock 5, suggestedQuantity 15,
    policyApplied true, preferredSupplier "Proveedor Auditoria SAC"
```

## 4. Tablero de abastecimiento

- `topSuppliers` se calcula agrupando evaluaciones por proveedor.
- Se ordena por promedio de calidad, entrega y servicio.
- Se devuelven los cinco mejores.

Verificado en vivo:

```json
{
  "supplierId": 1,
  "supplier": "Proveedor Auditoria SAC",
  "averageScore": 4.67,
  "evaluations": 1
}
```

## 5. Facturación de proveedor

- Se eliminó la restricción de una sola factura por orden.
- Se permite facturación parcial siempre que la suma acumulada no supere el total de la orden.
- Las facturas anuladas no cuentan para el acumulado.
- Nuevo `PATCH /api/cuentas-por-pagar/{id}/anular`.
- No se puede anular una factura pagada o con pagos registrados.

Verificado en vivo:

```text
PATCH /api/cuentas-por-pagar/1/anular        200 → ANULADA
POST  factura parcial 10.00                  200
POST  factura parcial 11.00                  200
POST  factura adicional 1.00                 400 → supera el total
```

## 6. Pruebas

- Backend: **161 pruebas, 0 fallos**.
- Nuevas pruebas:
  - aprobación con rol incorrecto;
  - voto duplicado;
  - actualización/reactivación de contrato;
  - política de reposición con lote y stock objetivo;
  - ranking de proveedores;
  - anulación de factura;
  - rechazo de anulación con pagos;
  - facturación parcial y acumulada.

## Pendiente para Fase 3

- Crear servicios, rutas, menú y pantallas para compras, proveedores y abastecimiento.
- Completar la matriz de Roles con `RECEPCIONAR`, `ANULAR` y `DEVOLVER`.
- Cargar roles personalizados en Usuarios.
- Aplicar gating de permisos en las pantallas que aún muestran acciones sin comprobarlo.
- Implementar la anulación de facturas de venta en el frontend.
