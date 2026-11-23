# Uso dual de MySQL y PostgreSQL

SIGTM admite ambos motores mediante perfiles de Spring. Cada instancia del backend
usa **un solo motor** durante toda su ejecución; no se alterna la base de datos en
caliente ni se escriben datos en ambos motores simultáneamente.

| Perfil | Motor | Comando Docker de desarrollo |
|---|---|---|
| `postgres` (predeterminado) | PostgreSQL 16 | `docker compose --env-file .env.postgres -f docker-compose.postgres.dev.yml up -d --build` |
| `mysql` | MySQL 8 | `docker compose -f docker-compose.dev.yml up -d --build` |

## Preparar PostgreSQL

```bash
cp .env.postgres.example .env.postgres
docker compose --env-file .env.postgres -f docker-compose.postgres.dev.yml up -d --build
```

Servicios disponibles en desarrollo:

- Portal: `http://localhost:5173`
- API: `http://localhost:8080`
- pgAdmin: `http://localhost:8082`
- PostgreSQL: `localhost:5432`

En pgAdmin, registrar el servidor con host `postgres` si se accede desde el
contenedor pgAdmin; desde la máquina local usar `localhost`.

## Selección sin Docker

```bash
SPRING_PROFILES_ACTIVE=postgres \
DB_URL='jdbc:postgresql://localhost:5432/sigtm_db' \
DB_USERNAME=sigtm_user \
DB_PASSWORD=sigtm_password \
./mvnw spring-boot:run
```

MySQL mantiene la configuración anterior mediante `SPRING_PROFILES_ACTIVE=mysql` en
sus archivos Compose. Si el backend se ejecuta sin perfil, usará PostgreSQL.
La abstracción `CorrelativoComprobanteInitializer` aplica el UPSERT propio de cada
motor, por lo que la emisión concurrente de comprobantes conserva su comportamiento.
