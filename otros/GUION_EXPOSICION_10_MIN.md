# Guion de exposición SIGTM — 5 integrantes

Duración total objetivo: **9 min 30 s**. Sustituir “Integrante 1–5” por los nombres del equipo.

| Integrante | Diapositivas | Tiempo | Idea central |
|---|---:|---:|---|
| 1 | 1–2 | 1:15 | Apertura, propósito y recorrido de la exposición. |
| 2 | 3 | 1:30 | Contexto del proyecto, módulos y avance de abastecimiento. |
| 3 | 4 | 2:00 | Arquitectura MVC, DAO y seguridad. |
| 4 | 5–7 | 2:45 | SOLID, TDD y librerías Java. |
| 5 | 8–10 | 2:00 | Git/GitHub, evidencias, conclusión y preguntas. |

## Guion fluido para decir

No es necesario memorizar palabra por palabra. La idea es mantener el orden, usar las transiciones indicadas y explicar mientras señalan el elemento visual de cada diapositiva.

### Integrante 1 — diapositivas 1 y 2 · 1 min 15 s

“Buenos días. Somos el equipo de SIGTM, un sistema de gestión para talleres automotrices. Nuestro propósito fue organizar los procesos principales del taller y, al mismo tiempo, dejar una base técnica que pueda crecer de manera ordenada.

Durante la exposición mostraremos el alcance funcional, la arquitectura, cómo aplicamos calidad mediante SOLID y TDD, las librerías Java utilizadas y el flujo de trabajo con Git y GitHub. Cada integrante abordará una parte del proceso para mostrar tanto el funcionamiento visible del portal como las decisiones técnicas que lo sustentan.

Para comenzar con el alcance del proyecto y los avances realizados, cedo la palabra a mi compañero.”

### Integrante 2 — diapositiva 3 · 1 min 30 s

“SIGTM combina un frontend desarrollado con React y TypeScript, un backend en Java con Spring Boot y una base de datos MySQL. Docker nos permite ejecutar estos componentes de manera consistente en diferentes equipos.

El sistema ya cuenta con módulos de clientes, vehículos, citas, órdenes de trabajo, inventario, facturación, roles y auditoría. Sobre esta base ampliamos el backend para cubrir abastecimiento: proveedores, solicitudes, órdenes de compra, aprobaciones, recepciones, devoluciones, reportes y planificación.

El flujo mostrado resume esa ampliación. Primero se registra y evalúa al proveedor; después se genera una solicitud según una necesidad; esta puede convertirse en una orden, pasar por aprobación y finalmente recibirse e inspeccionarse. Cada etapa representa una regla de negocio, no solo una pantalla o una tabla nueva.

Con este contexto, mi compañero explicará cómo se organizan internamente estos componentes.”

### Integrante 3 — diapositiva 4 · 2 min

“Para organizar la aplicación aplicamos una arquitectura MVC. La vista corresponde al frontend en React, donde el usuario completa formularios y visualiza información. Cuando el usuario realiza una acción, por ejemplo registrar un cliente, la solicitud llega a un controller del backend. El controller no contiene toda la lógica: su función es recibir la solicitud HTTP, validarla a nivel de entrada y delegar el trabajo.

La regla de negocio se concentra en los services. Allí se valida, por ejemplo, que no exista un cliente con el mismo documento, se genera su código, se guarda la información y se registra la auditoría. Finalmente, los repositories implementan el patrón DAO mediante Spring Data JPA; ellos encapsulan las consultas y operaciones de persistencia hacia MySQL.

Esta separación permite también aplicar seguridad de manera transversal. Usamos autenticación con JWT, contraseñas cifradas, control de acceso por roles y permisos mediante `@PreAuthorize`, auditoría de acciones y un límite de intentos de autenticación. De esta manera, no basta con que una pantalla esté visible: el backend también comprueba si el usuario tiene autorización.

Con la arquitectura explicada, mi compañero mostrará cómo aplicamos los principios de diseño y las pruebas sobre un proceso visible del portal.”

### Integrante 4 — diapositivas 5 a 7 · 2 min 45 s

“La siguiente lámina muestra SOLID con un proceso que sí puede observarse desde el portal: el registro de clientes. El formulario envía la información al `ClienteController`; este la dirige a `ClienteService`; el servicio utiliza `ClienteRepository` para persistir y se apoya en `CodeGeneratorService` y `AuditoriaService` para completar el proceso.

Aquí se evidencia responsabilidad única: cada bloque tiene una tarea concreta. También se evidencia inversión de dependencias, porque el servicio recibe sus colaboradores y no los crea directamente. Los repositorios son específicos por entidad, lo que evita interfaces gigantes, y durante una prueba el repositorio real puede sustituirse por un mock que mantiene el mismo contrato. Con esa separación, si en el futuro agregamos una notificación al registrar un cliente, extendemos el flujo sin convertir una sola clase en responsable de todo.

Para comprobar que las reglas realmente funcionan, aplicamos pruebas automatizadas con el ciclo TDD: Red, Green y Refactor. El caso mostrado usa un documento duplicado. La prueba simula que el documento ya existe y exige que el servicio rechace el registro. Antes de implementar esa validación, la prueba falla: ese es el estado Red. Luego se implementa la regla mínima; la misma prueba pasa y obtenemos Green. Finalmente se mejora el código sin cambiar el comportamiento protegido por la prueba.

También incorporamos librerías con un uso concreto. Apache POI permite generar archivos Excel; Google Guava limita intentos fallidos de autenticación; Apache Commons ayuda a validar y manejar archivos; y Logback conserva la trazabilidad de la aplicación. A continuación veremos cómo controlamos estos cambios de forma colaborativa.”

### Integrante 5 — diapositivas 8 a 10 · 2 min

“Para trabajar de forma colaborativa aplicamos un flujo con Git y GitHub. Cada funcionalidad se desarrolla en una rama; los cambios incluyen código, pruebas y documentación; luego se crea un Pull Request para que el trabajo sea revisable. Antes de integrarlo a `main`, se revisan los cambios y se ejecutan las verificaciones correspondientes. También cuidamos que archivos sensibles como `.env`, contraseñas, tokens y artefactos generados no se suban al repositorio.

Como evidencia, podemos mostrar el diagrama de arquitectura, las pruebas de `ClienteService`, el documento de librerías y el documento de módulos adicionales. Es importante que la métrica de Java se interprete como un indicador del avance del backend, pero que la evidencia principal siga siendo la funcionalidad, el diseño y las pruebas que acabamos de explicar.

En conclusión, SIGTM integra una arquitectura organizada, seguridad aplicada desde el backend, reglas de negocio verificables y un proceso de trabajo colaborativo. Esto nos permite continuar incorporando pantallas y procesos sin comprometer las funcionalidades ya existentes. Muchas gracias; quedamos atentos a sus preguntas.”

## Demo opcional de TDD

En entorno de desarrollo Docker:

```bash
docker exec sigtm_backend_dev sh ./mvnw -Dtest=ClienteServiceTest test
```

Si se usa `docker-compose.yml` (producción), el contenedor es `sigtm_backend` y no incluye Maven Wrapper. Para ejecutar pruebas se debe levantar `docker-compose.dev.yml` o ejecutarlas localmente desde `backend/` con Java 21.

## Antes de exponer

- Reemplazar los nombres de integrantes en la diapositiva 2.
- Ensayar con cronómetro: máximo 10 minutos.
- Tener abiertos `docs/arquitectura-sigtm.drawio`, `ClienteServiceTest.java` y `README_LIB_JAVA.md`.
- No modificar ni mostrar secretos, tokens o archivos `.env`.
