# SIGTM — API REST y funciones utilizadas

Referencia de la API que consume el frontend y de las funciones/servicios que las invocan.

## Arquitectura

```
Frontend (React + Vite)  ──HTTP/JSON──►  API REST (Spring Boot)  ──JPA──►  MySQL
        │                                          │
        │  JWT (Authorization: Bearer …)           └── SMTP (correo de recuperación)
        └── jsPDF / xlsx (exportaciones en el navegador)
```

- **URL base del API**: `/api` (o `VITE_API_URL`).
- **Autenticación**: JWT en el encabezado `Authorization: Bearer <token>`.
- **Autorización**: cada endpoint se protege con `@PreAuthorize("hasAuthority('MODULO:ACCION')")`.

## Cliente HTTP (frontend)

`frontend/src/services/api.ts` — instancia **axios**:
- `baseURL = VITE_API_URL || '/api'`.
- Interceptor de **request**: agrega el token JWT.
- Interceptor de **response**: ante **401** ejecuta `logout()` y redirige a `/acceso`.

## Endpoints por módulo

> Columna **Función**: función del frontend que consume el endpoint (`frontend/src/services/*.ts`).

### Autenticación `[/api/autenticacion]` — público
| Método | Endpoint | Permiso | Función |
|---|---|---|---|
| POST | `/ingresar` | público | `login()` |
| POST | `/olvidar-contrasena` | público | `forgotPassword()` |
| POST | `/restablecer-contrasena` | público | `resetPassword()` |
| GET | `/perfil` | sesión válida; siempre devuelve el perfil del JWT | `getMe()` |

### Clientes `[/api/clientes]`
| Método | Endpoint | Permiso | Función |
|---|---|---|---|
| GET | `/` | `CLIENTES:VER` | `getAllCustomers()` |
| GET | `/{id}` | `CLIENTES:VER` | `getCustomerById()` |
| POST | `/` | `CLIENTES:CREAR` | `createCustomer()` |
| PUT | `/{id}` | `CLIENTES:EDITAR` | `updateCustomer()` |
| DELETE | `/{id}` | `CLIENTES:ELIMINAR` | `deleteCustomer()` |

### Vehículos `[/api/vehiculos]`
| Método | Endpoint | Permiso | Función |
|---|---|---|---|
| GET | `/` | `VEHICULOS:VER` | `getAllVehicles()` |
| GET | `/{id}` | `VEHICULOS:VER` / `MI_TRABAJO:VER` | `getVehicleById()` |
| GET | `/cliente/{customerId}` | `VEHICULOS:VER` | `getVehiclesByCustomer()` |
| POST | `/cliente/{customerId}` | `VEHICULOS:CREAR` | `createVehicle()` |
| PUT | `/{id}` | `VEHICULOS:EDITAR` | `updateVehicle()` |
| DELETE | `/{id}` | `VEHICULOS:ELIMINAR` | `deleteVehicle()` |
| GET | `/{id}/historial` | `VEHICULOS:VER` / `MI_TRABAJO:VER` | `getVehicleHistory()` |

### Recepción `[/api/recepciones]`
| Método | Endpoint | Permiso | Función |
|---|---|---|---|
| GET | `/` | `RECEPCION:VER` | `getAllReceptions()` |
| GET | `/{id}` | `RECEPCION:VER` / `MI_TRABAJO:VER` | `getReceptionById()` |
| GET | `/vehiculo/{vehicleId}` | `RECEPCION:VER` / `MI_TRABAJO:VER` | `getReceptionsByVehicle()` |
| POST | `/` (multipart) | `RECEPCION:CREAR` | `createReception()` |
| POST | `/{id}/emitir-orden` | `RECEPCION:CREAR` | `emitOrderFromReception()` |

### Citas `[/api/citas]`
| Método | Endpoint | Permiso | Función |
|---|---|---|---|
| GET | `/` | `CITAS:VER` | `getAllAppointments()` |
| GET | `/fecha/{date}` | `CITAS:VER` | `getAppointmentsByDate()` |
| GET | `/{id}` | `CITAS:VER` | — |
| POST | `/cliente/{customerId}/vehiculo/{vehicleId}` | `CITAS:CREAR` | `createAppointment()` |
| PATCH | `/{id}/estado` | `CITAS:CAMBIAR_ESTADO` | `updateAppointmentStatus()` |

### Órdenes de trabajo `[/api/ordenes-trabajo]`
| Método | Endpoint | Permiso | Función |
|---|---|---|---|
| GET | `/` | `ORDENES:VER` | `getAllWorkOrders()` |
| GET | `/{id}` | `ORDENES:VER` / `MI_TRABAJO:VER` | `getWorkOrderById()` |
| GET | `/estado/{status}` | `ORDENES:VER` | `getWorkOrdersByStatus()` |
| POST | `/cliente/{customerId}/vehiculo/{vehicleId}` | `ORDENES:CREAR` | `createWorkOrder()` |
| PATCH | `/{id}/estado` | `ORDENES:CAMBIAR_ESTADO` | `updateWorkOrderStatus()` |
| PUT | `/{id}` | `ORDENES:EDITAR` | `updateWorkOrder()` |
| POST | `/{workOrderId}/detalles` | `ITEMS:CREAR` | `addWorkOrderItem()` |
| PUT | `/detalles/{itemId}` | `ITEMS:EDITAR` | `updateWorkOrderItem()` |
| DELETE | `/detalles/{itemId}` | `ITEMS:ELIMINAR` | `deleteWorkOrderItem()` |
| PATCH | `/detalles/{itemId}/estado` | `ITEMS:CAMBIAR_ESTADO` / `MI_TRABAJO:CAMBIAR_ESTADO` | `updateItemStatus()` |
| GET | `/mecanico/{mechanicId}/detalles` | `MI_TRABAJO:VER` | `getMyWorkItems()` |

### Inventario `[/api/productos]`
| Método | Endpoint | Permiso | Función |
|---|---|---|---|
| GET | `/` | `PRODUCTOS:VER` | `getAllProducts()` |
| GET | `/{id}` | `PRODUCTOS:VER` | `getProductById()` |
| GET | `/{id}/movimientos` | `MOVIMIENTOS:VER` | `getProductTransactions()` |
| POST | `/` | `PRODUCTOS:CREAR` | `createProduct()` |
| PUT | `/{id}` | `PRODUCTOS:EDITAR` | `updateProduct()` |
| DELETE | `/{id}` | `PRODUCTOS:ELIMINAR` | `deleteProduct()` |
| POST | `/{id}/existencia` | `MOVIMIENTOS:CREAR` / `MI_TRABAJO:CAMBIAR_ESTADO` | `adjustStock()` |

### Facturación `[/api/facturas]`
| Método | Endpoint | Permiso | Función |
|---|---|---|---|
| GET | `/` | `FACTURAS:VER` | `getAllInvoices()` |
| GET | `/{id}` | `FACTURAS:VER` | `getInvoiceById()` |
| POST | `/orden-trabajo/{workOrderId}` | `FACTURAS:CREAR` | `generateInvoice()` |
| PATCH | `/{id}/pagar` | `FACTURAS:APROBAR` | `payInvoice()` |

### Notificaciones `[/api/notificaciones]` — sesión válida
| Método | Endpoint | Permiso | Función |
|---|---|---|---|
| GET | `/` | sesión válida | `getNotifications()` |
| GET | `/no-leidas` | sesión válida | `getUnreadCount()` |
| PATCH | `/{id}/leida` | sesión válida | `markAsRead()` |
| PATCH | `/leer-todas` | sesión válida | `markAllAsRead()` |

### Panel y Reportes `[/api/reportes]`
| Método | Endpoint | Permiso | Función |
|---|---|---|---|
| GET | `/panel-indicadores` | `DASHBOARD:VER` | `getDashboardMetrics()` |
| GET | `/ingresos-mensuales` | `DASHBOARD:VER` | `getMonthlyRevenue()` |
| GET | `/panel-resumen` | `DASHBOARD:VER` | `getDashboardSummary()` |
| GET | `/panel-linea` | `DASHBOARD:VER` | `getDashboardLine()` |
| GET | `/panel-barras` | `DASHBOARD:VER` | `getDashboardBars()` |
| GET | `/panel-dona` | `DASHBOARD:VER` | `getDashboardDonut()` |
| GET | `/servicios-mas-solicitados` | `DASHBOARD:VER` | `getTopServices()` |
| GET | `/centro?tipo=` | `REPORTES:VER` | `getReporteCentro()` |
| GET | `/centro/excel?tipo=` | `REPORTES:EXPORTAR` | `exportCentroExcelConApachePoi()`; disponible solo con `USE_APACHE_POI=true` |

### Usuarios `[/api/usuarios]`
| Método | Endpoint | Permiso | Función |
|---|---|---|---|
| GET | `/` | `USUARIOS:VER` | `getAllUsers()` |
| GET | `/mecanicos` | `USUARIOS:VER` / `ORDENES:VER` | `getMechanics()` |
| POST | `/` | `USUARIOS:CREAR` | `createUser()` |
| GET | `/actual/permisos` | sesión válida | `getMyPermissions()` |
| GET | `/{id}` | `USUARIOS:VER` | `getUserById()` |
| PUT | `/{id}` | `USUARIOS:EDITAR` | `updateUser()` |
| PATCH | `/{id}/estado` | `USUARIOS:CAMBIAR_ESTADO` | `setUserActive()` |

### Roles y permisos `[/api/roles]`, `[/api/permisos]`
| Método | Endpoint | Permiso | Función |
|---|---|---|---|
| GET | `/roles` | `ROLES:VER` | `getRoles()` |
| POST | `/roles` | `ADMIN` | `createRole()` |
| PUT | `/roles/{id}` | `ADMIN` | `updateRole()` |
| DELETE | `/roles/{id}` | `ADMIN` | `deleteRole()` |
| PUT | `/roles/{id}/permisos` | `ADMIN` | `setRolePermissions()` |
| GET | `/permisos` | `ROLES:VER` | `getAllPermissions()` |

### Auditoría `[/api/auditoria]`
| Método | Endpoint | Permiso | Función |
|---|---|---|---|
| GET | `/` | `AUDITORIA:VER` | `getAuditLogs()` |
| GET | `/acciones` | `AUDITORIA:VER` | `getAuditActions()` |

### Configuración `[/api/configuracion]`, `[/api/configuracion/catalogo]`, `[/api/catalogo-servicios]`
| Método | Endpoint | Permiso | Función |
|---|---|---|---|
| GET | `/configuracion` | `CONFIGURACION:VER` | `getSettings()` |
| PUT | `/configuracion` | `CONFIGURACION:EDITAR` | `updateSettings()` |
| GET | `/configuracion/catalogo?tipo=` | `CONFIGURACION:VER` | `getCatalog()` |
| POST | `/configuracion/catalogo` | `CONFIGURACION:EDITAR` | `createCatalogItem()` |
| PUT | `/configuracion/catalogo/{id}` | `CONFIGURACION:EDITAR` | `updateCatalogItem()` |
| DELETE | `/configuracion/catalogo/{id}` | `CONFIGURACION:EDITAR` | `deleteCatalogItem()` |
| GET | `/catalogo-servicios` | `ORDENES:VER` / `MI_TRABAJO:VER` | `getAllServicesCatalog()` / `getServicesCatalog()` |
| GET | `/catalogo-servicios/{id}` | `ORDENES:VER` | — |
| POST | `/catalogo-servicios` | `CONFIGURACION:EDITAR` | `createServiceCatalog()` |
| PUT | `/catalogo-servicios/{id}` | `CONFIGURACION:EDITAR` | `updateServiceCatalog()` |

## Funciones que NO llaman al API (se ejecutan en el navegador)

`frontend/src/services/exportService.ts`:
- `exportCentroPdf()` / `exportCentroExcel()` — reporte del Centro de Reportes.
- Con `VITE_USE_APACHE_POI=true`, `exportCentroExcelConApachePoi()` descarga el XLSX desde el endpoint protegido del backend; con `false` usa `xlsx` localmente.
- `exportReportPdf()` / `exportReportExcel()` — reporte de rendimiento.
- Usan **jsPDF + jspdf-autotable** (PDF), **xlsx** (Excel local) y Apache POI en el backend para el Excel opcional del Centro de Reportes.

## Estado global y utilidades (frontend)

- Contextos: `PermissionContext`, `SettingsContext`, `ThemeContext`, `ToastProvider`.
- `lib/utils.ts` → `cn()` (clsx + tailwind-merge).
- `lib/routeAccess.ts` → mapa ruta → permiso.

## Librerías

- **Frontend**: `axios`, `react`, `react-dom`, `react-router-dom`, `recharts`, `lucide-react`, `jspdf`, `jspdf-autotable`, `xlsx`, `clsx`, `tailwind-merge`, Tailwind v4, Vite, TypeScript.
- **Backend**: Spring Boot (web, data-jpa, security, validation, mail), Apache POI, `mysql-connector-j`, `lombok`, `jackson-databind`, `jjwt`.

## Servicios externos

- **MySQL** — base de datos.
- **SMTP** — envío de correos (recuperación de contraseña).
