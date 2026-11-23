<#
 .SYNOPSIS
 Despliega SIGTM en Azure con PostgreSQL Flexible Server y Container Apps.

 .DESCRIPTION
 Crea recursos de bajo consumo para un entorno de demostración/desarrollo:
 - PostgreSQL Flexible Server Burstable B1ms, 32 GiB, sin alta disponibilidad.
 - Azure Container Apps Consumption: backend 0.5 vCPU/1 GiB y frontend 0.25 vCPU/0.5 GiB.
 - Azure Container Registry Basic para construir las imágenes en Azure.

 No escribe secretos en archivos. Se solicitan durante la ejecución y se guardan
 como secretos de Container Apps. La base usa acceso público limitado a servicios
 de Azure (0.0.0.0) para evitar crear una VNet en este entorno mínimo.
#>
[CmdletBinding()]
param(
    [string]$SubscriptionId,
    [string]$ResourceGroup = "rg-sigtm-dev",
    [string]$Location = "brazilsouth",
    [ValidatePattern('^[a-z0-9]{3,12}$')]
    [string]$Prefix = "sigtm",
    [ValidatePattern('^[a-z0-9]{4,10}$')]
    [string]$Suffix = "$(Get-Random -Minimum 1000 -Maximum 9999)"
)

$ErrorActionPreference = "Stop"

function Get-PlainSecret([string]$Prompt) {
    $secure = Read-Host -Prompt $Prompt -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
}

function Assert-AzSuccess {
    if ($LASTEXITCODE -ne 0) {
        throw "Azure CLI informó un error. El despliegue se detuvo."
    }
}

if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    throw "Azure CLI no está instalado. Instálalo desde https://aka.ms/installazurecliwindows"
}

if ($SubscriptionId) {
    az account set --subscription $SubscriptionId
    Assert-AzSuccess
}

$account = az account show --query "id" --output tsv 2>$null
if (-not $account) {
    throw "No existe una sesión de Azure activa. Ejecuta 'az login' y vuelve a intentarlo."
}

$dbPassword = Get-PlainSecret "Contraseña del administrador PostgreSQL"
if ($dbPassword.Length -lt 12) {
    throw "La contraseña PostgreSQL debe tener al menos 12 caracteres."
}
$jwtSecret = Get-PlainSecret "JWT_SECRET Base64 (mínimo 32 bytes)"
if ([string]::IsNullOrWhiteSpace($jwtSecret)) {
    throw "JWT_SECRET es obligatorio."
}

$postgresServer = "$Prefix-pg-$Suffix"
$registry = "$Prefix$Suffixacr"
$environment = "$Prefix-env-$Suffix"
$database = "sigtm_db"
$dbUser = "sigtmadmin"
$backendApp = "backend"
$frontendApp = "frontend"
$tag = "$(Get-Date -Format 'yyyyMMddHHmmss')"

Write-Host "Creando grupo de recursos $ResourceGroup en $Location..." -ForegroundColor Cyan
az group create --name $ResourceGroup --location $Location --tags application=SIGTM environment=development
Assert-AzSuccess

az extension add --name containerapp --upgrade --only-show-errors
Assert-AzSuccess
az provider register --namespace Microsoft.App --wait
Assert-AzSuccess
az provider register --namespace Microsoft.OperationalInsights --wait
Assert-AzSuccess

Write-Host "Creando PostgreSQL Flexible Server B1ms..." -ForegroundColor Cyan
az postgres flexible-server create `
    --resource-group $ResourceGroup `
    --name $postgresServer `
    --location $Location `
    --admin-user $dbUser `
    --admin-password $dbPassword `
    --sku-name Standard_B1ms `
    --tier Burstable `
    --version 16 `
    --storage-size 32 `
    --backup-retention 7 `
    --high-availability Disabled `
    --public-access 0.0.0.0 `
    --tags application=SIGTM environment=development
Assert-AzSuccess

az postgres flexible-server db create --resource-group $ResourceGroup --server-name $postgresServer --database-name $database
Assert-AzSuccess

Write-Host "Creando Azure Container Registry Basic..." -ForegroundColor Cyan
az acr create --resource-group $ResourceGroup --name $registry --sku Basic --admin-enabled true
Assert-AzSuccess

Write-Host "Construyendo imágenes dentro de Azure Container Registry..." -ForegroundColor Cyan
az acr build --registry $registry --image "sigtm-backend:$tag" --file backend/Dockerfile backend
Assert-AzSuccess
az acr build --registry $registry --image "sigtm-frontend:$tag" --file frontend/Dockerfile frontend
Assert-AzSuccess

$registryServer = az acr show --resource-group $ResourceGroup --name $registry --query loginServer --output tsv
$registryUser = az acr credential show --resource-group $ResourceGroup --name $registry --query username --output tsv
$registryPassword = az acr credential show --resource-group $ResourceGroup --name $registry --query "passwords[0].value" --output tsv
$databaseUrl = "jdbc:postgresql://$postgresServer.postgres.database.azure.com:5432/$database?sslmode=require"

Write-Host "Creando entorno de Azure Container Apps..." -ForegroundColor Cyan
az containerapp env create --resource-group $ResourceGroup --name $environment --location $Location
Assert-AzSuccess

Write-Host "Desplegando backend interno..." -ForegroundColor Cyan
az containerapp create `
    --resource-group $ResourceGroup `
    --name $backendApp `
    --environment $environment `
    --image "$registryServer/sigtm-backend:$tag" `
    --registry-server $registryServer `
    --registry-username $registryUser `
    --registry-password $registryPassword `
    --ingress internal `
    --target-port 8080 `
    --cpu 0.5 --memory 1.0Gi --min-replicas 0 --max-replicas 1 `
    --secrets "db-password=$dbPassword" "jwt-secret=$jwtSecret" `
    --env-vars "SPRING_PROFILES_ACTIVE=postgres" "DB_URL=$databaseUrl" "DB_USERNAME=$dbUser" "DB_PASSWORD=secretref:db-password" "JWT_SECRET=secretref:jwt-secret" "SEED_DATA=true" "COOKIE_SECURE=true" "COOKIE_SAME_SITE=Strict" "USE_APACHE_POI=true"
Assert-AzSuccess

Write-Host "Desplegando frontend público..." -ForegroundColor Cyan
az containerapp create `
    --resource-group $ResourceGroup `
    --name $frontendApp `
    --environment $environment `
    --image "$registryServer/sigtm-frontend:$tag" `
    --registry-server $registryServer `
    --registry-username $registryUser `
    --registry-password $registryPassword `
    --ingress external `
    --target-port 80 `
    --cpu 0.25 --memory 0.5Gi --min-replicas 0 --max-replicas 1
Assert-AzSuccess

$frontendFqdn = az containerapp show --resource-group $ResourceGroup --name $frontendApp --query "properties.configuration.ingress.fqdn" --output tsv
az containerapp update `
    --resource-group $ResourceGroup `
    --name $backendApp `
    --set-env-vars "FRONTEND_URL=https://$frontendFqdn" "CORS_ALLOWED_ORIGINS=https://$frontendFqdn"
Assert-AzSuccess

Write-Host "Despliegue completado." -ForegroundColor Green
Write-Host "Portal: https://$frontendFqdn" -ForegroundColor Green
Write-Host "Base de datos: $postgresServer.postgres.database.azure.com" -ForegroundColor Yellow
Write-Host "Para eliminar todo y detener costos: az group delete --name $ResourceGroup --yes --no-wait" -ForegroundColor Yellow
