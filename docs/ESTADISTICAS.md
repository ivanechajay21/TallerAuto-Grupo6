# Estadísticas del proyecto SIGTM

> **Fecha:** 6 de noviembre de 2026
> **Métrica:** líneas de código (LOC) = líneas **no vacías**.
> **Exclusiones:** `node_modules`, `target`, `dist`, `.git`, `build`, `.mvn`, `uploads`, `coverage`, `package-lock.json`, binarios y archivos minificados.

## Resumen por lenguaje (código fuente versionado)

| Lenguaje | Archivos | Líneas de código | % |
|---|---:|---:|---:|
| TSX (React) | 42 | 12 574 | 42.7 % |
| **Java** | **233** | **13 760** | **46.8 %** |
| TS (servicios/utilidades) | 26 | 2 063 | 7.0 % |
| CSS | 2 | 414 | 1.4 % |
| XML (pom) / YML / HTML / JS | 9 | 610 | 2.1 % |
| **Total** | **312** | **29 421** | **100 %** |

### Vistas rápidas

- **Java (backend): 13 760 líneas → 46.8 %** del código fuente del proyecto.
- **Frontend (TSX + TS + CSS): 15 051 líneas → 51.2 %.**
- **Configuración (XML/YML/HTML/JS): 2.1 %.**
- **Por número de archivos:** Java = **233 de 312** archivos de código (**74.7 %**), con muchos archivos pequeños de entidades, repositorios, DTOs y pruebas.

## Backend — Java por paquete (`src/main/java`)

| Paquete | Archivos | Líneas de código |
|---|---:|---:|
| `service` | 38 | 4 948 |
| `controller` | 36 | 2 380 |
| `model` | 51 | 1 575 |
| `repository` | 41 | 855 |
| `security` (incl. `jwt`) | 7 | 487 |
| `config` | 3 | 428 |
| `dto` | 25 | 338 |
| `exception` | 4 | 149 |
| raíz (`BackendApplication`) | 1 | 15 |
| **Subtotal `main`** | **206** | **11 175** |
| `test` | 27 | 2 585 |
| **Total Java** | **233** | **13 760** |

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

- Proyecto **full-stack**: el **backend en Java/Spring Boot** concentra cerca de **la mitad de las líneas** y tres cuartas partes de los archivos de código.
- El **frontend en React/TypeScript** pesa algo más de la mitad de las líneas, algo habitual en aplicaciones de gestión con paneles, tablas y formularios.
- Dentro del backend, la **lógica de negocio (`service`) es el bloque más grande**, seguido de los controladores (API REST) y el modelo de datos.
- Dentro del frontend, las **páginas** (`pages`) son, con diferencia, el bloque más grande.
- La suite de pruebas aporta **2 585 líneas Java** y **28 pruebas de frontend**, además de pruebas de integración con MySQL real y generación de PDF.

### Notas

- Esta métrica es **por líneas**; otra forma de medir es por archivos (ahí Java pesa ~75 %) o por tiempo de desarrollo (no medible desde el código).
- Los **comentarios JavaDoc** forman parte de las ~13 700 líneas Java; el código productivo sin comentarios/espacios es menor.
