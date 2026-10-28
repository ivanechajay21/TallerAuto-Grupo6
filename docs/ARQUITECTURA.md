# Evaluación de arquitectura y buenas prácticas — SIGTM

> **Fecha:** 5 de octubre de 2026
> Evaluación basada en el código fuente del proyecto (backend Spring Boot + frontend React).

## Veredicto rápido

| Criterio | ¿Cumple? | Nivel | Comentario |
|---|---|:--:|---|
| **MVC** | ✅ | Alto | Adaptado a API REST + SPA (no MVC clásico con vistas server-side) |
| **DAO** | ✅ | Alto | Repositorios Spring Data JPA (patrón DAO/Repository) |
| **TDD** | ❌ → ⚠️ | Bajo | No había pruebas; ya se añadió una primera suite |
| **SOLID** | ⚠️ | Medio | Aplicado de forma pragmática, no estricta |
| **Seguridad** | ✅ | Alto | JWT + BCrypt + autorización por permiso por endpoint |

---

## 1) MVC — ✅ (variante API + SPA)

**Evidencia**
- `controller/` (17) → `service/` (19) → `repository/` (19) → `model/` (22).
- Los controladores reciben la petición HTTP, delegan en el servicio y devuelven **JSON** (DTOs/mapas).
- La **Vista (V)** es el **SPA** en `frontend/` (React), que consume la API. No hay vistas server-side.

**Conclusión:** el patrón se cumple. Es más preciso llamarlo **arquitectura en capas (Controller–Service–Repository)** expuesta como **API REST**, que “MVC clásico” con plantillas en el servidor.

## 2) DAO — ✅

**Evidencia**
- 19 interfaces en `repository/` extendiendo `JpaRepository` (consultas derivadas, `@Query` y `@Lock` pesimista, p. ej. `ProductoRepository.findWithLockingById`).
- El acceso a datos está **separado** de la lógica (`service`) y del API (`controller`).

**Conclusión:** el patrón **DAO/Repository** está bien implementado mediante Spring Data JPA.

## 3) TDD — ❌ (mejorando)

**Estado inicial**
- `backend/src/test`: 1 archivo (`BackendApplicationTests`) con **una** prueba `contextLoads()` (smoke test, sin valor funcional).
- Frontend: **sin** pruebas (`*.test.*` / `*.spec.*`).

**Mejora aplicada**
- `backend/src/test/java/com/sigtm/backend/service/ProductoServiceTest.java` — **12 pruebas** (JUnit 5 + Mockito) sobre reglas del inventario:
  - filtrado de `obtenerTodos` (texto libre, sin búsqueda, incluir inactivos);
  - `obtenerPorId` inexistente → `ResourceNotFoundException`;
  - `crearProducto`: código obligatorio, código duplicado, valores por defecto, auditoría;
  - `actualizarProducto`: código duplicado;
  - `eliminarProducto`: baja lógica;
  - `aplicarCambioStock`: solicitud nula, cantidad inválida y tipo inválido.
- `backend/src/test/java/com/sigtm/backend/service/RolServiceTest.java` — **13 pruebas** centradas en roles y permisos, con énfasis en la **salvaguarda del `ROLE_ADMIN`**:
  - al ADMIN nunca se le pueden quitar `ROLES:VER`, `ROLES:ASIGNAR` ni `USUARIOS:VER` (incluso con lista vacía);
  - un rol NO admin respeta exactamente la lista indicada;
  - `crearRol` (nombre obligatorio/duplicado/normalización), `eliminarRol` (rol de sistema, con usuarios, caso correcto) y `obtenerMisPermisos`.
- `backend/src/test/java/com/sigtm/backend/controller/ProductoControllerTest.java` — **10 pruebas de la capa web** (`@WebMvcTest` + MockMvc, `@MockitoBean` del servicio), validando:
  - contrato HTTP: `200` (listar/detalle/crear), `204` (eliminar), `400` (validación de Bean Validation) y `404` (no encontrado vía `GlobalExceptionHandler`);
  - **autorización `@PreAuthorize`**: petición sin `PRODUCTOS:VER` (o con permiso equivocado) → **403**.
  - *(Requiere el módulo de test `spring-boot-starter-webmvc-test`, añadido al `pom.xml`.)*
- `backend/src/test/java/com/sigtm/backend/controller/RolControllerTest.java` — **11 pruebas de la capa web** centradas en la **autorización por rol**: la consulta exige `ROLES:VER`; **todas las escrituras (crear/actualizar/eliminar roles y asignar permisos) exigen rol `ADMIN`** → un usuario con `ROLE_MANAGER` recibe **403**; también se cubren `200`, `204` y `404`.
- `backend/src/test/java/com/sigtm/backend/controller/OrdenTrabajoControllerTest.java` — **5 pruebas de la capa web** (`@WebMvcTest` + MockMvc) para los ítems de una orden: agregar exige `ITEMS:CREAR`, actualizar `ITEMS:EDITAR` y eliminar `ITEMS:ELIMINAR`; se cubre la asignación de un mecánico mediante `mechanicId` y el rechazo con **403** cuando falta el permiso.
- **Frontend** (Vitest + Testing Library + jsdom): `Pagination.test.tsx` (5), `usePagination.test.ts` (4), `Login.test.tsx` (3), `Reports.test.tsx` (4), `Inventory.test.tsx` (3) y `Vehicles.test.tsx` (4) → **23 pruebas**. Se añadió el script `npm test`, `vitest.config.ts` y los tests se excluyen del `tsc` de producción.
- Resultado: **backend 51** (`mvn -Dtest=ProductoServiceTest,RolServiceTest,ProductoControllerTest,RolControllerTest,OrdenTrabajoControllerTest test`) **+ frontend 23** (`npm test`) = **74 pruebas**, todas en verde.

**Cobertura por capa**
| Capa | Suite | Pruebas |
|---|---|---:|
| Backend — servicio (negocio) | `ProductoServiceTest` | 12 |
| Backend — servicio (seguridad de roles) | `RolServiceTest` | 13 |
| Backend — web (inventario + permisos) | `ProductoControllerTest` | 10 |
| Backend — web (roles + rol ADMIN) | `RolControllerTest` | 11 |
| Backend — web (ítems + asignación) | `OrdenTrabajoControllerTest` | 5 |
| Frontend — componente UI | `Pagination.test.tsx` | 5 |
| Frontend — hook | `usePagination.test.ts` | 4 |
| Frontend — página (acceso) | `Login.test.tsx` | 3 |
| Frontend — página (reportes) | `Reports.test.tsx` | 4 |
| Frontend — página (inventario) | `Inventory.test.tsx` | 3 |
| Frontend — página (vehículos) | `Vehicles.test.tsx` | 4 |
| **Total** | | **74** |

**Conclusión:** el proyecto **no aplicaba TDD**; con esta suite se **inicia** la cobertura del backend (aún lejos de TDD completo).

## 4) SOLID — ⚠️ (pragmático)

| Principio | Estado | Observación |
|---|:--:|---|
| **S** — Responsabilidad única | ⚠️ | Buena separación, pero hay servicios grandes (`service` ≈ 3.9k líneas; `ReporteService`, `OrdenTrabajoService` con 8–11 métodos). |
| **O** — Abierto/Cerrado | ⚠️ | `ReporteService` usa `switch` por `tipo`: agregar un reporte obliga a modificar la clase. |
| **L** — Sustitución de Liskov | ✅ | Entidades heredan de `Auditable`; `UserDetailsImpl implements UserDetails`. Sin violaciones evidentes. |
| **I** — Segregación de interfaces | ⚠️ | Repositorios pequeños y específicos ✅; los **servicios no exponen interfaces**. |
| **D** — Inversión de dependencias | ⚠️ | Servicios dependen de **interfaces** de repositorio (✅) e inyectan por constructor; los controladores dependen de **clases concretas** de servicio (⚠️). |

**Conclusión:** SOLID se aplica a nivel práctico; no de forma estricta.

## 5) Seguridad — ✅ (sólida)

**Evidencia** (`WebSecurityConfig` + paquete `security/`)
- **JWT** (`jjwt`) con sesión **STATELESS** y `AuthTokenFilter` que **recarga los permisos desde BD** en cada petición.
- **Contraseñas cifradas** con `BCryptPasswordEncoder` (nunca en texto plano).
- **Autorización por permiso** `@PreAuthorize("hasAuthority('MODULO:ACCION')")` en ~76 endpoints; `hasRole('ADMIN')` en las escrituras de roles; `@EnableMethodSecurity`.
- **CORS** configurable; entry point 401 personalizado; endpoints públicos acotados (`/api/autenticacion/**`, `/uploads/**`, `/error`).
- Complementos: **auditoría** de acciones, validación con `@Valid` y `GlobalExceptionHandler`.

**Observaciones / riesgos**
- El CORS por defecto es `*` (`app.cors.allowed-origins`) → **restringir orígenes en producción**.
- `csrf` deshabilitado: correcto para API stateless con token.

**Conclusión:** seguridad **bien resuelta**.

---

## Recomendaciones (por prioridad)

1. **Ampliar pruebas** (el hueco más grande): unitarias de servicios (Mockito), `@WebMvcTest` para controladores y pruebas de integración con `@SpringBootTest`/Testcontainers.
2. **Reducir clases “gordas”** y sustituir el `switch` de `ReporteService` por un **mapa de estrategias** (Open/Closed).
3. **Opcional**: extraer **interfaces** para los servicios (DIP estricto).
4. **Producción**: fijar `app.cors.allowed-origins` a dominios concretos.

---

## Resumen

- **Arquitectura** en capas limpia (Controller–Service–Repository) → **MVC-API** ✅.
- **DAO** vía Spring Data JPA ✅.
- **Seguridad** fuerte (JWT, BCrypt, permisos por endpoint) ✅.
- **SOLID** aplicado de forma pragmática ⚠️.
- **TDD** era el punto débil ❌; ahora hay **74 pruebas** (51 backend + 23 frontend) que cubren servicio, capa web y UI.

Documentos relacionados: [`API.md`](../API.md) · [`ESTADISTICAS.md`](./ESTADISTICAS.md)
