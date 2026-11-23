# Despliegue mínimo de SIGTM en Azure

El script `deploy.ps1` prepara un entorno de demostración con PostgreSQL como
motor predeterminado:

```text
Internet → Frontend (Azure Container Apps, externo)
               ↓ /api y /uploads
          Backend (Azure Container Apps, interno)
               ↓ TLS
     Azure Database for PostgreSQL Flexible Server
```

El frontend conserva el proxy Nginx hacia el nombre interno `backend`; Azure
Container Apps ofrece descubrimiento de servicios por nombre dentro del mismo
entorno.

## Recursos y tamaño inicial

| Recurso | Configuración | Motivo |
|---|---|---|
| PostgreSQL Flexible Server | Burstable `Standard_B1ms`, 1 vCore, 2 GiB, 32 GiB de almacenamiento, 7 días de backup, sin HA | Opción administrada mínima para desarrollo/demostración. |
| Backend | Container Apps Consumption, 0.5 vCPU / 1 GiB, 0–1 réplicas | Adecuado para Spring Boot pequeño; puede escalar a cero. |
| Frontend | Container Apps Consumption, 0.25 vCPU / 0.5 GiB, 0–1 réplicas | Solo sirve contenido estático y proxy. |
| Registro | Azure Container Registry Basic | Permite construir y almacenar las dos imágenes. |

## Requisitos

- Azure CLI autenticado: `az login`.
- Una suscripción con permiso para crear recursos.
- PowerShell 7 o Windows PowerShell.

## Ejecución

Desde la raíz del repositorio:

```powershell
./infra/azure/deploy.ps1 `
  -ResourceGroup rg-sigtm-dev `
  -Location brazilsouth `
  -Prefix sigtm `
  -Suffix demo01
```

Si hay más de una suscripción:

```powershell
./infra/azure/deploy.ps1 -SubscriptionId "<id-de-suscripcion>" -Suffix demo01
```

El script solicita interactivamente la contraseña de PostgreSQL y el secreto JWT;
no crea archivos `.env` ni imprime esos valores. Para el acceso más económico,
la base permite tráfico desde recursos Azure mediante la regla `0.0.0.0`. Esto es
apropiado para una demostración, pero en producción se debe usar red privada,
identidad administrada y un registro ACR sin cuenta administradora.

## Operación y costos

- Los Container Apps pueden escalar a cero; el primer acceso tendrá arranque en frío.
- El Flexible Server B1ms es para carga baja, desarrollo o demostración. Supervisar
  los créditos de CPU y escalar a B2s o General Purpose si se agotan.
- Eliminar el grupo detiene todos los costos:

```powershell
az group delete --name rg-sigtm-dev --yes --no-wait
```

## Validación posterior

```powershell
az containerapp show -g rg-sigtm-dev -n frontend --query properties.configuration.ingress.fqdn -o tsv
az containerapp logs show -g rg-sigtm-dev -n backend --follow
```
