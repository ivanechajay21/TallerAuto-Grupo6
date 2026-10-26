# SIGTM — Sistema Integral de Gestión para Talleres Mecánicos

Aplicación web para administrar la operación de un taller mecánico: clientes y vehículos, citas, recepción, órdenes de trabajo, inventario, facturación, reportes, usuarios y permisos.

## Componentes

| Componente | Tecnología | Responsabilidad |
|---|---|---|
| `frontend/` | React 19, TypeScript, Vite y Tailwind CSS | Interfaz SPA, control de acceso por permiso, paneles, formularios, exportación de PDF y Excel. |
| `backend/` | Java 21, Spring Boot, Spring Security, JPA y JWT | API REST, reglas de negocio, autenticación/autorización, auditoría, correo y carga de archivos. |
| MySQL 8 | Base de datos | Persistencia de usuarios, operación del taller, catálogos y auditoría. |
| `docs/` y `API.md` | Markdown | Arquitectura, métricas del proyecto y referencia detallada de la API. |

La comunicación habitual es: **React → `/api` → Spring Boot → MySQL**. El frontend envía el JWT en el encabezado `Authorization: Bearer <token>` y el backend autoriza cada operación mediante permisos.

## Funcionalidades

- Gestión de clientes, vehículos e historial.
- Citas, recepción de vehículos y emisión de órdenes de trabajo.
- Asignación y seguimiento de trabajos de mecánicos.
- Inventario, movimientos de existencias y catálogo de servicios.
- Facturación, dashboard y centro de reportes con exportación a PDF/Excel.
- Usuarios, roles, permisos, configuración y auditoría.
- Recuperación de contraseña por SMTP y carga de imágenes/documentos de recepción.

## Requisitos

La forma recomendada de ejecutar el sistema requiere únicamente:

- Docker Engine con Docker Compose v2.

Para desarrollo sin contenedores se necesita:

- Java 21.
- Node.js 22 (o una versión compatible con las dependencias del frontend) y npm.
- MySQL 8.

## Entorno de desarrollo

### Desarrollo con Docker

1. Crea el archivo de variables a partir del ejemplo y define un secreto JWT de desarrollo:

   ```bash
   cp .env.example .env
   openssl rand -base64 48
   ```

   Copia la salida del segundo comando en `JWT_SECRET` dentro de `.env`. Para correo Gmail usa una *App Password*. No publiques este archivo ni uses secretos reales de producción.

2. Construye e inicia todos los servicios:

   ```bash
   docker compose up --build
   ```

   Para generar el Excel del Centro de Reportes en el backend con Apache POI,
   configura `USE_APACHE_POI=true` antes de construir. Con `false` (valor por
   defecto), se conserva la exportación local con `xlsx`. Como Vite incorpora
   esta variable al compilar, reconstruye el frontend al cambiarla.

3. Abre los servicios:

   | Servicio | URL |
   |---|---|
   | Aplicación web | http://localhost:3000 |
   | API REST | http://localhost:8080/api |
   | phpMyAdmin | http://localhost:8081 |
   | MySQL | `localhost:3306` |

### Desarrollo con recarga automática

Para desarrollar dentro de Docker con Vite y recarga automática del frontend, usa la configuración específica de desarrollo. Mantiene volúmenes y nombres de contenedor distintos al entorno integrado estándar:

```bash
docker compose -f docker-compose.dev.yml up --build
```

| Servicio | URL |
|---|---|
| Frontend Vite (HMR) | http://localhost:5173 |
| API REST | http://localhost:8080/api |
| phpMyAdmin | http://localhost:8081 |

El código de `frontend/` y `backend/` se monta en los contenedores. Los cambios del frontend se reflejan automáticamente; para cambios Java, reinicia el servicio backend con `docker compose -f docker-compose.dev.yml restart backend`.

Para detener este entorno sin borrar sus datos:

```bash
docker compose -f docker-compose.dev.yml down
```

Con `SEED_DATA=true`, el primer arranque crea esquema, roles, permisos y datos de muestra. Las siguientes cuentas son exclusivas de desarrollo:

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `admin123` | Administrador |
| `gerente` | `gerente123` | Gerente |
| `recepcion` | `recepcion123` | Recepcionista |
| `mecanico` | `mecanico123` | Mecánico |
| `almacen` | `almacen123` | Almacenero |

Los contenedores usan los valores definidos en `.env`. phpMyAdmin se conecta al servidor `mysql`; usa las credenciales configuradas por `ROOT_PASSWORD`, `MYSQL_USER` y `MYSQL_PASSWORD`.

Para detener los servicios conservando la base de datos y los archivos cargados:

```bash
docker compose down
```

Para reiniciar completamente el entorno local, incluidos volúmenes de MySQL y archivos subidos:

```bash
docker compose down -v
```

> Este último comando elimina datos locales de forma irreversible.

### Desarrollo local sin contenedores

### 1. Base de datos

Inicia MySQL 8 y crea una base y usuario equivalentes a los valores por defecto:

```sql
CREATE DATABASE sigtm_db;
CREATE USER 'sigtm_user'@'localhost' IDENTIFIED BY 'sigtm_password';
GRANT ALL PRIVILEGES ON sigtm_db.* TO 'sigtm_user'@'localhost';
FLUSH PRIVILEGES;
```

También puedes iniciar solo la base de datos con Docker:

```bash
docker compose up mysql phpmyadmin
```

### 2. Backend

Desde otra terminal:

```bash
cd backend
sh ./mvnw spring-boot:run
```

La API quedará disponible en `http://localhost:8080`. La configuración está en `backend/src/main/resources/application.yml` y admite, entre otras, estas variables de entorno:

```bash
export DB_URL='jdbc:mysql://localhost:3306/sigtm_db?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true'
export DB_USERNAME='sigtm_user'
export DB_PASSWORD='sigtm_password'
export JWT_SECRET="$(openssl rand -base64 48)"
export MAIL_USERNAME='tu.correo@gmail.com'
export MAIL_PASSWORD='tu_app_password'
export FRONTEND_URL='http://localhost:5173'
export SEED_DATA='true'
export USE_APACHE_POI='true' # opcional: exportación XLSX con Apache POI
```

### 3. Frontend

En otra terminal:

```bash
cd frontend
npm ci
npm run dev
```

Vite mostrará normalmente la aplicación en `http://localhost:5173`. En desarrollo, el proxy de Vite envía `/api` y `/uploads` al backend en el puerto 8080.

Si el API se encuentra en otro host o puerto, crea `frontend/.env.local` con una URL accesible desde el navegador:

```bash
VITE_API_URL=http://localhost:8080/api
```

## Pruebas y compilación

```bash
# Backend: pruebas y empaquetado
cd backend
sh ./mvnw test
sh ./mvnw package

# Frontend: pruebas, análisis y compilación de producción
cd ../frontend
npm ci
npm test
npm run lint
npm run build
```

La compilación de producción del frontend se publica con Nginx en la imagen Docker. Nginx también redirige `/api` y `/uploads` al contenedor del backend, por lo que no se requiere configurar `VITE_API_URL` al utilizar `docker compose`.

## Entorno de producción

No utilices el `.env` de desarrollo ni las cuentas de demostración. Crea las variables en el gestor de secretos de la plataforma o en un archivo protegido fuera del repositorio:

```dotenv
ROOT_PASSWORD=<contraseña-robusta-y-unica>
MYSQL_DATABASE=sigtm_db
MYSQL_USER=sigtm_app
MYSQL_PASSWORD=<contraseña-robusta-y-unica>
JWT_SECRET=<salida-de-openssl-rand--base64-48>
MAIL_HOST=<servidor-smtp>
MAIL_PORT=587
MAIL_USERNAME=<cuenta-smtp>
MAIL_PASSWORD=<secreto-smtp>
FRONTEND_URL=https://app.ejemplo.com
CORS_ALLOWED_ORIGINS=https://app.ejemplo.com
SEED_DATA=false
USE_APACHE_POI=true
```

Pasos de despliegue:

1. Configura DNS y un proxy inverso/TLS delante del contenedor frontend; expón HTTPS y redirige HTTP a HTTPS.
2. Provisiona MySQL con backups, usuario de privilegios mínimos y una red privada; no expongas el puerto 3306 públicamente.
3. Define las variables anteriores mediante secretos del proveedor. Genera `JWT_SECRET` con `openssl rand -base64 48` y nunca reutilices uno de desarrollo.
4. Construye e inicia: `docker compose up -d --build`.
5. Verifica que `SEED_DATA=false`, crea el administrador inicial mediante un proceso controlado y elimina cualquier cuenta de demostración existente.
6. Expón públicamente solo el proxy HTTPS. Los puertos de MySQL, phpMyAdmin y el backend deben permanecer internos o protegidos por red/VPN.

`USE_APACHE_POI` debe tener el mismo valor en backend y frontend. Con Docker
Compose se propaga automáticamente; tras cambiarlo ejecuta
`docker compose up -d --build frontend backend`. El endpoint de Apache POI requiere el permiso
`REPORTES:EXPORTAR` y obtiene las filas directamente de la base de datos.

En producción, configura HSTS en el proxy TLS y establece una política de copias de seguridad, monitorización de logs sin secretos y actualización periódica de imágenes y dependencias.

## Estructura

```text
.
├── backend/                 # API Spring Boot
│   └── src/main/java/.../
│       ├── controller/      # Endpoints REST
│       ├── service/         # Lógica de negocio
│       ├── repository/      # Acceso a datos JPA
│       ├── model/           # Entidades persistentes
│       ├── security/        # JWT y configuración de seguridad
│       └── config/          # Siembra de datos y configuración
├── frontend/                # SPA React/Vite
│   └── src/
│       ├── pages/           # Vistas por módulo
│       ├── components/      # Componentes reutilizables
│       ├── services/        # Clientes de la API y exportaciones
│       └── context/         # Tema, permisos y configuración
├── docs/                    # Documentación técnica y estadísticas
├── API.md                   # Endpoints, permisos y consumidores
├── docker-compose.yml       # Entorno integrado
└── .env.example             # Variables de ejemplo
```

## Documentación adicional

- [Referencia de la API](API.md): rutas, métodos, permisos y servicios que las consumen.
- [Seguridad de la aplicación](README_seguridad.md): controles, evidencias y verificaciones operativas.
- [Arquitectura y evaluación de prácticas](docs/ARQUITECTURA.md).
- [Estadísticas de código](docs/ESTADISTICAS.md).

## Consideraciones de seguridad

- No uses en producción las credenciales iniciales ni secretos generados para desarrollo.
- Define `CORS_ALLOWED_ORIGINS` con dominios explícitos; no se permite el comodín global.
- Mantén las credenciales SMTP y los secretos fuera del repositorio (por ejemplo, en `.env` o en un gestor de secretos).
