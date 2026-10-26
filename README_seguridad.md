# Seguridad de SIGTM

Este documento describe los controles de seguridad implementados en SIGTM y cómo contribuyen al objetivo de proteger **datos, usuarios, servidores y aplicaciones**. Debe leerse junto con el [README principal](README.md) y la [referencia de la API](API.md).

## Objetivo y alcance

SIGTM es una aplicación web compuesta por un frontend React, una API Spring Boot y MySQL. Su superficie de seguridad abarca:

- Identidad y sesiones de usuarios.
- Datos personales, operativos y de inventario almacenados en MySQL.
- API REST, carga de imágenes y frontend web.
- Contenedores, secretos, red y configuración de despliegue.

## Resumen de controles

| Activo protegido | Control | Evidencia técnica |
|---|---|---|
| Contraseñas | Hash BCrypt; las contraseñas no se serializan en respuestas. | `WebSecurityConfig`, `UsuarioService`, `UserDetailsImpl` |
| Sesiones | JWT HS256 con expiración, versión de sesión y revocación al cambiar contraseña o desactivar una cuenta. | `JwtUtils`, `AuthTokenFilter`, `Usuario.tokenVersion` |
| Acceso a funciones | Autorización por permisos con `@PreAuthorize` y rol ADMIN para operaciones sensibles de roles. | `controller/`, `WebSecurityConfig` |
| Perfil del usuario | El perfil propio se obtiene desde el JWT, no desde un ID manipulable en la URL. | `GET /api/autenticacion/perfil` |
| Fuerza bruta | Límite de cinco fallos de inicio de sesión y tres solicitudes de recuperación por ventana de 15 minutos. | `LoginAttemptService` |
| Restablecimiento | Token aleatorio de 32 bytes, de un uso, con vencimiento y almacenado como hash SHA-256. | `AuthService`, `TokenResetContrasena` |
| Archivos | Solo JPEG/PNG válidos, máximo 10 MB por archivo y diez fotografías por recepción. | `StorageService`, `RecepcionController` |
| Exportación Excel | Endpoint autorizado, datos obtenidos en el servidor y celdas de texto protegidas de formula injection. | `ReporteController`, `ReporteExcelService` |
| API web | CORS centralizado y limitado por `CORS_ALLOWED_ORIGINS`; sesiones stateless; CSRF desactivado para API Bearer. | `WebSecurityConfig` |
| Frontend | Cabeceras CSP, anti-clickjacking, `nosniff`, política de referer y permisos del navegador. | `frontend/nginx.conf` |
| Secretos y despliegue | Credenciales y JWT obligatorios por variables de entorno; sin secretos de producción en código. | `.env.example`, `docker-compose.yml`, `application.yml` |

## Protección de usuarios

### Autenticación y contraseñas

- Spring Security autentica a cada usuario mediante `DaoAuthenticationProvider`.
- Las contraseñas se codifican con `BCryptPasswordEncoder`; nunca se persisten ni devuelven como texto plano.
- La creación, actualización y recuperación de contraseña exigen al menos **12 caracteres**.
- Las cuentas desactivadas no pueden autenticarse, porque `UserDetailsImpl.isEnabled()` usa el estado persistido del usuario.

### JWT y revocación

Cada JWT contiene el nombre de usuario, fecha de emisión, vencimiento y `tokenVersion`. En cada solicitud, `AuthTokenFilter` vuelve a cargar el usuario y sus permisos desde la base de datos.

La sesión deja de ser válida cuando:

- Se cambia o restablece la contraseña.
- Se desactiva la cuenta.
- El token expira.

Esto limita el uso de sesiones robadas y hace que los cambios de permisos se apliquen en la siguiente solicitud. Los valores de `Authorization` y JWT no se escriben en los logs.

### Prevención de abuso

`LoginAttemptService` bloquea temporalmente una identidad después de cinco intentos de login fallidos. También limita la recuperación de contraseña a tres solicitudes por correo durante 15 minutos. La respuesta de recuperación no revela si el correo existe.

> En un despliegue con varias réplicas del backend, este contador debe migrarse a Redis u otra caché compartida para que el límite sea global.

## Protección de datos y autorización

### Permisos

La API requiere autenticación para toda ruta salvo autenticación pública, error y recursos de carga existentes. Los controladores protegen sus acciones con permisos granulares como `CLIENTES:VER`, `ORDENES:EDITAR` o `FACTURAS:APROBAR`.

Las operaciones de administración de roles requieren `ADMIN`; los permisos del administrador se preservan mediante reglas adicionales del servicio de roles. Los cambios relevantes se registran en auditoría.

### Perfil propio y datos sensibles

El endpoint `GET /api/autenticacion/perfil` identifica al usuario desde el JWT. No recibe un ID de usuario, con lo que evita el acceso horizontal a perfiles de otras personas. La consulta administrativa de otros usuarios continúa en `/api/usuarios/{id}` y exige `USUARIOS:VER`.

### Restablecimiento de contraseña

El token que viaja por correo no se almacena en texto claro: antes de persistirse se calcula su hash SHA-256. El token expira, solo puede usarse una vez y se invalida toda sesión previa cuando la contraseña se modifica.

## Protección de la aplicación

### CORS, validación y errores

- CORS se configura en un único punto con `CORS_ALLOWED_ORIGINS`; no se usa el comodín global.
- La API usa validación Bean Validation en las solicitudes que la declaran y maneja errores de forma uniforme.
- La sesión es `STATELESS` y CSRF está desactivado porque la autenticación se realiza con `Authorization: Bearer`, no con cookies de sesión.
- Las respuestas de error no incluyen trazas internas del servidor.

### Carga de archivos

Las fotografías de recepción se validan antes de guardarse:

- Tipo admitido: `image/jpeg` o `image/png`.
- Contenido comprobado mediante lectura de imagen, no solo extensión declarada.
- Máximo 10 MB por imagen y diez imágenes por recepción.
- Nombre generado con UUID y extensión controlada por el servidor.

Los recursos de `/uploads/**` se sirven públicamente para que el frontend pueda mostrar imágenes directamente. Por ello, los archivos deben limitarse a evidencias no confidenciales. Para material confidencial, la siguiente mejora debe ser un endpoint de descarga autenticado y autorizado por propietario/rol.

### Exportación de reportes

Con `USE_APACHE_POI=true`, el Excel del Centro de Reportes se construye en el
backend con Apache POI. `GET /api/reportes/centro/excel` exige
`REPORTES:EXPORTAR` y vuelve a consultar los datos autorizados en el servidor;
el navegador no puede aportar o alterar las filas a exportar. Las cadenas que
comienzan con `=`, `+`, `-` o `@` se escriben como texto para impedir inyección
de fórmulas al abrir el archivo. Con `false`, sigue disponible la exportación
local existente mediante `xlsx`.

### Cabeceras del frontend

Nginx establece, entre otras:

- `Content-Security-Policy` para limitar orígenes de scripts, conexiones e imágenes.
- `X-Frame-Options: DENY` contra clickjacking.
- `X-Content-Type-Options: nosniff`.
- `Referrer-Policy` y `Permissions-Policy` restrictivas.

HTTPS y HSTS deben configurarse en el proxy inverso o balanceador que exponga la aplicación a Internet.

## Protección de servidores y despliegue

### Secretos

El backend requiere `JWT_SECRET` y las credenciales de MySQL a través de variables de entorno. `docker-compose.yml` no incluye valores secretos por defecto. Genera el secreto JWT con:

```bash
openssl rand -base64 48
```

Guárdalo en un gestor de secretos o en un `.env` protegido que nunca se suba al repositorio.

### Entornos

- `docker-compose.yml`: ejecución integrada, similar a producción.
- `docker-compose.dev.yml`: desarrollo local con Vite/HMR, Java 21 y volúmenes de desarrollo separados.
- `SEED_DATA=true`: solo desarrollo, crea cuentas y catálogos de demostración.
- `SEED_DATA=false`: obligatorio en producción; no crea las cuentas conocidas de demostración.

En producción se debe exponer únicamente el proxy HTTPS. MySQL, phpMyAdmin y el puerto del backend deben permanecer en red privada, VPN o reglas de firewall restringidas.

## Verificación operativa

Antes de desplegar, ejecutar:

```bash
# Frontend
cd frontend
npm ci
npm test
npm run build

# Backend dentro de Docker con Java 21
cd ..
docker compose build backend
docker run --rm --entrypoint java tallerauto-backend:latest -version
```

Comprobaciones funcionales recomendadas:

1. Un token anterior debe recibir `401` después de cambiar contraseña o desactivar al usuario.
2. Un usuario autenticado solo puede obtener su perfil mediante `/api/autenticacion/perfil`.
3. Un origen no incluido en `CORS_ALLOWED_ORIGINS` debe ser rechazado por el navegador.
4. El sexto intento fallido de login debe responder `429`.
5. Cargas HTML, SVG, JavaScript, imágenes falsas, archivos mayores a 10 MB o más de diez fotos deben ser rechazados.
6. Confirmar que logs de aplicación no contengan `Bearer ` ni valores JWT.

## Responsabilidades pendientes de operación

Los controles de código no reemplazan la administración segura del entorno. Antes de producción se requiere:

- Certificado TLS válido, redirección HTTP→HTTPS y HSTS en el proxy.
- Backups cifrados de MySQL y pruebas periódicas de restauración.
- Actualización regular de imágenes Docker y dependencias Maven/npm.
- Monitorización de errores y accesos, sin registrar secretos ni datos personales innecesarios.
- Almacenamiento centralizado para el rate limiting si se usan múltiples instancias backend.
- Diseño de descarga autenticada para imágenes que contengan información confidencial.
