# Fase 3 — Módulos de compras en el frontend

> **Fecha:** 8 de noviembre de 2026
>
> **Objetivo:** exponer en la aplicación los módulos de proveedores, compras y abastecimiento, completar roles/permisos y corregir accesos visibles.

## Nuevas rutas

| Ruta | Página | Permiso |
|---|---|---|
| `/proveedores` | Proveedores y contratos | `PROVEEDORES:VER` |
| `/compras` | Órdenes, aprobaciones y recepciones | `COMPRAS:VER` |
| `/abastecimiento` | Reposición, planificación, pagos y presupuesto | `COMPRAS:VER` |

También se añadieron al menú lateral, al mapa de rutas y a los metadatos del encabezado.

## Módulo de proveedores

- Listado, búsqueda, creación y edición de proveedores.
- Desactivación con confirmación.
- Contratos por proveedor:
  - listar;
  - crear;
  - editar;
  - desactivar;
  - reactivar.
- Visualización de descuento, días de pago y compra mínima.

## Módulo de compras

- Listado y búsqueda de órdenes.
- Creación de orden con múltiples productos, cantidades y costos.
- Detalle de la orden.
- Aprobaciones:
  - niveles configurados;
  - decisión por nivel;
  - historial;
  - configuración de nuevos niveles.
- Recepción parcial o total de líneas pendientes.
- Seguimiento logístico:
  - estado;
  - transportista;
  - guía;
  - llegada estimada y real.
- Anulación de órdenes pendientes.

## Módulo de abastecimiento

- Tablero:
  - productos críticos;
  - solicitudes pendientes;
  - órdenes abiertas;
  - entregas demoradas;
  - deuda abierta;
  - top proveedores.
- Reposición:
  - sugerencias calculadas con la política;
  - generación de solicitud desde sugerencias;
  - configuración de políticas por producto/proveedor.
- Planificación:
  - listado de planes;
  - creación manual;
  - conversión de plan en solicitud.
- Cuentas por pagar:
  - listado;
  - pago total o parcial;
  - anulación sin pagos.
- Presupuesto:
  - consulta por período;
  - límite y porcentaje de alerta;
  - estado de consumo.

## Roles, usuarios y permisos

- La matriz de Roles ahora reconoce:
  - `RECEPCIONAR`;
  - `ANULAR`;
  - `DEVOLVER`.
- Se añadieron las etiquetas de módulos `SUPPLIERS` y `PURCHASES`.
- La edición de roles y permisos queda restringida a `ROLE_ADMIN`.
- Usuarios carga los roles desde el backend, por lo que los roles personalizados ya se pueden asignar.
- Se aplicó gating de permisos en:
  - Clientes: crear/editar.
  - Vehículos: crear/editar.
  - Citas: crear, cambiar estado y generar orden.
  - Recepción: emitir orden.
  - Usuarios: editar y cambiar estado.
  - Mi trabajo: cambiar estado.

## Buscador global

El buscador del Header ahora:

- Recorta espacios y evita buscar vacío.
- Navega a `/vehiculos?q=...`.
- Sincroniza el parámetro cuando ya se está en la página de vehículos.

Verificado con CDP:

```text
URL final: http://localhost:3000/vehiculos?q=AYS-153
Resultado visible: true
```

## Anulación de facturas de venta

- Nuevo endpoint `PATCH /api/facturas/{id}/anular`.
- Solo permite anular comprobantes pendientes.
- Rechaza comprobantes pagados o ya anulados.
- El frontend muestra la acción solo con `FACTURAS:ELIMINAR`.

## Verificación

- Backend: **163 pruebas, 0 fallos**.
- Frontend: **28 pruebas, 0 fallos**.
- Build de producción correcto.
- Capturas verificadas de:
  - Proveedores.
  - Compras.
  - Abastecimiento.
  - Resultado del buscador global.
- Docker:
  - Backend healthy.
  - Frontend healthy.
  - MySQL healthy.
