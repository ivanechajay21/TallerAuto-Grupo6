# Evidencias de librerías Java

Los snapshots de esta carpeta se generan a partir del código y configuración
reales del backend. Cada uno vincula una dependencia declarada con una
funcionalidad concreta de SIGTM.

| Snapshot | Librería | Funcionalidad evidenciada |
|---|---|---|
| `dependencias_java_configuradas.svg` | Apache POI, Guava, Commons y Logback | Declaración de dependencias en `backend/pom.xml`. |
| `apache_poi_exportacion_excel.svg` | Apache POI (`poi-ooxml`) | Crea libros XLSX, hojas, encabezados, estilos, celdas y congelamiento de paneles para el Centro de Reportes. |
| `google_guava_control_intentos.svg` | Google Guava | Caché con vencimiento de 15 minutos y límite de intentos fallidos de acceso o recuperación. |
| `apache_commons_carga_imagenes.svg` | Apache Commons Lang e IO | Valida MIME de imágenes y crea/copía archivos hacia el almacenamiento mensual. |
| `logback_trazabilidad_consola.svg` | Logback | Formato y nivel de logs de aplicación y eventos de seguridad en consola. |

La explicación completa de uso está disponible en `README_LIB_JAVA.md`.
