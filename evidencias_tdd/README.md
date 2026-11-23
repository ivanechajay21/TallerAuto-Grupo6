# Evidencias de pruebas automatizadas

Esta carpeta contiene snapshots generados desde el código fuente y los reportes
JUnit ejecutados localmente. Las pruebas preservan el comportamiento actual de
módulos existentes; por ello se describen correctamente como **pruebas de
caracterización**. Constituyen evidencia de una práctica de pruebas compatible
con TDD, sin afirmar que todo el código histórico fue creado con TDD estricto.

| Archivo | Fuente | Evidencia |
|---|---|---|
| `01_cliente_service_test.svg` | `ClienteServiceTest.java` | Alta, documento duplicado, actualización y baja lógica. |
| `02_vehiculo_service_test.svg` | `VehiculoServiceTest.java` | Propietario, placa/VIN duplicados, actualización y desactivación. |
| `03_cita_service_test.svg` | `CitaServiceTest.java` | Creación, relaciones, consulta por fecha y transición de estado. |
| `04_factura_service_test.svg` | `FacturaServiceTest.java` | Emisión, subtotal, IGV, total, validaciones y pago. |
| `reporte_junit_facturacion.svg` | Reporte Surefire de `FacturaServiceTest` | Seis pruebas ejecutadas, cero errores y cero fallos. |

## Snapshots focalizados para presentación

Estos archivos muestran una función de prueba completa, con preparación, ejecución
y aserciones; son los recomendados para una sustentación visual.

| Archivo | Regla de negocio evidenciada |
|---|---|
| `tdd_registro_cliente_y_auditoria.svg` | Registro de cliente: código, estado, fecha y auditoría. |
| `tdd_validacion_placa_y_vin.svg` | Rechazo de placa o VIN duplicado sin persistir información. |
| `tdd_actualizacion_estado_cita.svg` | Cambio de `PENDING` a `CONFIRMED` y auditoría del evento. |
| `tdd_calculo_igv_factura.svg` | Cálculo de subtotal, IGV (18 %) y total al emitir factura. |
| `tdd_registro_pago_factura.svg` | Transición de factura a `PAID` y conservación del monto. |

## Ejecución reproducible

```bash
cd backend
./mvnw -Dtest=ClienteServiceTest,VehiculoServiceTest,CitaServiceTest,FacturaServiceTest test
```

Resultado de la ejecución documentada: **21 pruebas, 0 fallos y 0 errores**.
