# Estadísticas del proyecto SIGTM

> **Fecha:** 5 de noviembre de 2026
> **Métrica:** líneas de código (LOC) = líneas **no vacías**.
> **Exclusiones:** `node_modules`, `target`, `dist`, `.git`, `build`, `.mvn`, `uploads`, `coverage`, `package-lock.json`, binarios y archivos minificados.

## Resumen por lenguaje (código fuente versionado)

| Lenguaje | Archivos | Líneas de código | % |
|---|---:|---:|---:|
| TSX (React) | 42 | 12 341 | 42.9 % |
| **Java** | **233** | **13 716** | **47.7 %** |
| TS (servicios/utilidades) | 23 | 1 653 | 5.8 % |
| CSS | 2 | 414 | 1.4 % |
| XML (pom) / YML / HTML / JS | 9 | 610 | 2.1 % |
| **Total** | **309** | **28 734** | **100 %** |

### Vistas rápidas

- **Java (backend): 13 716 líneas → 47.7 %** del código fuente del proyecto.
- **Frontend (TSX + TS + CSS): 14 408 líneas → 50.1 %.**
- **Configuración (XML/YML/HTML/JS): 2.1 %.**
- **Por número de archivos:** Java = **233 de 309** archivos de código (**75.4 %**), con muchos archivos pequeños de entidades, repositorios, DTOs y pruebas.

## Backend — Java por paquete (`src/main/java`)

| Paquete | Archivos | Líneas de código |
|---|---:|---:|
| `service` | 38 | 4 910 |
| `controller` | 36 | 2 380 |
| `model` | 51 | 1 575 |
| `repository` | 41 | 855 |
| `security` (incl. `jwt`) | 7 | 487 |
| `config` | 3 | 428 |
| `dto` | 25 | 338 |
| `exception` | 4 | 149 |
| raíz (`BackendApplication`) | 1 | 15 |
| **Subtotal `main`** | **206** | **11 137** |
| `test` | 27 | 2 579 |
| **Total Java** | **233** | **13 716** |

## Frontend — por carpeta (`src`)

| Carpeta | Archivos | Líneas de código |
|---|---:|---:|
| `pages` | 22 | 9 569 |
| `components` | 16 | 2 540 |
| `services` | 17 | 1 496 |
| raíz (`App`, `main`, `index.css`…) | 4 | 533 |
| `context` | 3 | 142 |
| `lib` | 2 | 48 |
| `hooks` | 2 | 73 |
| `test` | 1 | 7 |
| **Subtotal `src`** | **67** | **14 408** |

> Los archivos de `assets` (imágenes/SVG) no se cuentan como líneas de código. La configuración de Vite/Tailwind/HTML se agrupa en la fila de configuración del resumen.

## Conclusiones

- Proyecto **full-stack**: el **backend en Java/Spring Boot** concentra cerca de **la mitad de las líneas** y la mayor parte de los archivos de código.
- El **frontend en React/TypeScript** pesa algo más de la mitad de las líneas, algo habitual en aplicaciones de gestión con paneles, tablas y formularios.
- Dentro del backend, la **lógica de negocio (`service`) es el bloque más grande**, seguido de los controladores (API REST) y el modelo de datos.
- Dentro del frontend, las **páginas** (`pages`) son, con diferencia, el bloque más grande.
- La suite de pruebas aporta **2 579 líneas Java** y **26 pruebas de frontend**, además de pruebas de integración con MySQL real.

### Notas

- Esta métrica es **por líneas**; otra forma de medir es por archivos (ahí Java pesa ~75 %) o por tiempo de desarrollo (no medible desde el código).
- Los **comentarios JavaDoc** forman parte de las ~13 700 líneas Java; el código productivo sin comentarios/espacios es menor.
