# Librerías Java de SIGTM

Este documento identifica las librerías Java adicionales usadas por el backend y la
funcionalidad del sistema que cubre cada una. Todas se declaran en
`backend/pom.xml`.

| Librería | Uso en SIGTM | Ubicación principal |
|---|---|---|
| Apache POI (`poi-ooxml`) | Genera archivos Excel `.xlsx` del Centro de Reportes cuando está habilitada la opción `USE_APACHE_POI=true`. | `backend/src/main/java/com/sigtm/backend/service/ReporteExcelService.java` |
| Google Guava | Mantiene en memoria, con vencimiento de 15 minutos, el contador de intentos fallidos de inicio de sesión y solicitudes de recuperación. Impide ataques de fuerza bruta y devuelve HTTP 429 al superar el límite. | `backend/src/main/java/com/sigtm/backend/security/LoginAttemptService.java` |
| Apache Commons Lang (`commons-lang3`) | Normaliza y compara de forma segura el tipo MIME de las imágenes cargadas, evitando valores nulos o vacíos en la validación. | `backend/src/main/java/com/sigtm/backend/service/StorageService.java` |
| Apache Commons IO (`commons-io`) | Crea el directorio mensual de cargas y persiste las imágenes de recepción desde el flujo de entrada hacia el disco. | `backend/src/main/java/com/sigtm/backend/service/StorageService.java` |
| Logback (`logback-classic`) | Configura el registro de la aplicación por consola, con fecha, nivel, hilo, aplicación y clase. En particular conserva trazabilidad de eventos de seguridad, JWT y autenticación, apta para contenedores Docker. | `backend/src/main/resources/logback-spring.xml` |

## Consideraciones

- La caché de Guava es local a cada instancia del backend. Si SIGTM se despliega en varias instancias, debe sustituirse por una caché compartida, como Redis.
- Apache POI se activa mediante `USE_APACHE_POI=true`; con el valor por defecto, el frontend mantiene su alternativa de exportación local.
- Logback se usa detrás de SLF4J/Lombok (`@Slf4j`), que es la abstracción de logging utilizada por las clases Java del proyecto.
