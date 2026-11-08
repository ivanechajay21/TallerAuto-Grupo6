# Estadísticas del proyecto SIGTM

> **Fecha:** 6 de noviembre de 2026
> **Métrica:** líneas de código (LOC) = líneas **no vacías**.
> **Exclusiones:** `node_modules`, `target`, `dist`, `.git`, `build`, `.mvn`, `uploads`, `coverage`, `package-lock.json`, binarios y archivos minificados.

## Resumen por líneas (LOC no vacías)

| Lenguaje | Archivos | Líneas de código | % |
|---|---:|---:|---:|
| TSX (React) | 42 | 12 574 | 41.2 % |
| **Java** | **236** | **14 863** | **48.7 %** |
| TS (servicios/utilidades) | 26 | 2 063 | 6.8 % |
| CSS | 2 | 414 | 1.4 % |
| XML (pom) / YML / HTML / JS | 9 | 610 | 2.0 % |
| **Total** | **315** | **30 524** | **100 %** |

## Resumen por bytes (métrica de GitHub Linguist)

Esta es la métrica que usa GitHub para mostrar la composición de lenguajes del repositorio. Cuenta el tamaño de los archivos de código, no las líneas no vacías.

| Lenguaje | Archivos | Tamaño | % |
|---|---:|---:|---:|
| **Java** | **236** | **755 942 B** | **52.3 %** |
| TSX (React) | 42 | 590 163 B | 40.8 % |
| TS (servicios/utilidades) | 26 | 73 711 B | 5.1 % |
| XML (pom) / YML / HTML / JS | 9 | 18 294 B | 1.3 % |
| CSS | 2 | 8 513 B | 0.6 % |
| **Total** | **315** | **1 446 623 B** | **100 %** |

> **Java supera el 50 % con la métrica de GitHub Linguist (52.3 %).** Por líneas no vacías está en 48.7 %; por archivos, Java representa el **74.9 %**. La Fase 1 de compras agregó DTOs, validaciones y pruebas reales sin relleno.

### Vistas rápidas

- **Java (backend): 14 863 líneas → 48.7 %** del código por LOC; **755 942 bytes → 52.3 %** por tamaño de archivos.
- **Frontend (TSX + TS + CSS): 15 051 líneas → 49.3 %** por LOC; **672 387 bytes → 46.5 %** por bytes.
- **Configuración (XML/YML/HTML/JS): 2.0 %** por LOC.
- **Por número de archivos:** Java = **236 de 315** archivos de código (**74.9 %**).

## Backend — Java por paquete (`src/main/java`)

| Paquete | Archivos | Líneas de código |
|---|---:|---:|
| `service` | 38 | 5 454 |
| `controller` | 36 | 2 440 |
| `model` | 51 | 1 584 |
| `repository` | 41 | 864 |
| `security` (incl. `jwt`) | 7 | 487 |
| `config` | 3 | 428 |
| `dto` | 26 | 545 |
| `exception` | 4 | 149 |
| raíz (`BackendApplication`) | 1 | 15 |
| **Subtotal `main`** | **207** | **11 966** |
| `test` | 29 | 2 897 |
| **Total Java** | **236** | **14 863** |

## Frontend — por carpeta (`src`)

| Carpeta | Archivos | Líneas de código |
|---|---:|---:|
| `pages` | 22 | 9 795 |
| `components` | 16 | 2 540 |
| `services` | 20 | 1 906 |
| raíz (`App`, `main`, `index.css`…) | 4 | 533 |
| `context` | 3 | 149 |
| `lib` | 2 | 48 |
| `hooks` | 2 | 73 |
| `test` | 1 | 7 |
| **Subtotal `src`** | **70** | **15 051** |

> Los archivos de `assets` (imágenes/SVG) no se cuentan como líneas de código. La configuración de Vite/Tailwind/HTML se agrupa en la fila de configuración del resumen.

## Conclusiones

- Proyecto **full-stack**: el **backend en Java/Spring Boot** concentra **50.4 % de los bytes de código** (métrica de GitHub Linguist), cerca de la mitad de las líneas no vacías y tres cuartas partes de los archivos de código.
- El **frontend en React/TypeScript** pesa algo más de la mitad de las líneas no vacías, algo habitual en aplicaciones de gestión con paneles, tablas y formularios.
- Dentro del backend, la **lógica de negocio (`service`) es el bloque más grande**, seguido de los controladores (API REST) y el modelo de datos.
- Dentro del frontend, las **páginas** (`pages`) son, con diferencia, el bloque más grande.
- La suite de pruebas aporta **2 897 líneas Java** y **28 pruebas de frontend**, además de pruebas de integración con MySQL real, serialización de compras y generación de PDF.

### Notas

- Esta métrica es **por líneas**; otra forma de medir es por archivos (ahí Java pesa ~75 %) o por tiempo de desarrollo (no medible desde el código).
- Los **comentarios JavaDoc** forman parte de las ~13 700 líneas Java; el código productivo sin comentarios/espacios es menor.
