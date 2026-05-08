# TrackWise Database Deployment Script
# PowerShell version for Windows deployment

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroup = "trackwise-rg",

    [Parameter(Mandatory=$false)]
    [string]$Location = "eastus",

    [Parameter(Mandatory=$false)]
    [string]$ServerName = "trackwise-postgres-$((New-Guid).ToString().Substring(0,8).ToLower())",

    [Parameter(Mandatory=$true)]
    [string]$AdminPassword,

    [Parameter(Mandatory=$false)]
    [string]$VnetName = "trackwise-vnet",

    [Parameter(Mandatory=$false)]
    [string]$SubnetName = "postgresql-subnet",

    [Parameter(Mandatory=$false)]
    [string]$DatabaseName = "trackwise"
)

# Colors for output
$Green = "Green"
$Yellow = "Yellow"
$Red = "Red"
$Cyan = "Cyan"

Write-Host "TrackWise Database Deployment Script" -ForegroundColor $Green
Write-Host "==================================" -ForegroundColor $Green

# Check if Azure CLI is installed
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Azure CLI is not installed. Please install it first." -ForegroundColor $Red
    exit 1
}

# Check if logged in
try {
    $account = az account show 2>$null | ConvertFrom-Json
} catch {
    Write-Host "Error: Not logged in to Azure. Please run 'az login' first." -ForegroundColor $Red
    exit 1
}

Write-Host "Deploying Azure PostgreSQL Flexible Server..." -ForegroundColor $Yellow

# Create resource group if it doesn't exist
Write-Host "Creating resource group: $ResourceGroup" -ForegroundColor $Cyan
az group create --name $ResourceGroup --location $Location --output none

# Create virtual network and subnet
Write-Host "Creating virtual network and subnet..." -ForegroundColor $Cyan
az network vnet create `
    --resource-group $ResourceGroup `
    --name $VnetName `
    --address-prefix 10.0.0.0/16 `
    --subnet-name $SubnetName `
    --subnet-prefix 10.0.1.0/24 `
    --output none

# Deploy PostgreSQL server
Write-Host "Deploying PostgreSQL Flexible Server..." -ForegroundColor $Cyan
az deployment group create `
    --resource-group $ResourceGroup `
    --template-file infrastructure/postgresql.bicep `
    --parameters `
        serverName=$ServerName `
        administratorLoginPassword=$AdminPassword `
        virtualNetworkName=$VnetName `
        databaseName=$DatabaseName `
        allowPublicAccess=false `
    --output none

# Get server details
$serverFqdn = az postgres flexible-server show `
    --resource-group $ResourceGroup `
    --name $ServerName `
    --query fullyQualifiedDomainName -o tsv

Write-Host "PostgreSQL server deployed successfully!" -ForegroundColor $Green
Write-Host "Server: $ServerName" -ForegroundColor $Cyan
Write-Host "FQDN: $serverFqdn" -ForegroundColor $Cyan
Write-Host "Database: $DatabaseName" -ForegroundColor $Cyan
Write-Host ""

# Wait for server to be ready
Write-Host "Waiting for server to be ready..." -ForegroundColor $Yellow
Start-Sleep -Seconds 30

# Create database schema instructions
Write-Host "Next steps:" -ForegroundColor $Yellow
Write-Host "1. Connect to the database using a PostgreSQL client:" -ForegroundColor $Cyan
Write-Host "   psql 'host=$serverFqdn port=5432 user=trackwiseadmin dbname=$DatabaseName sslmode=require'" -ForegroundColor $Cyan
Write-Host ""
Write-Host "2. Run the schema files in order:" -ForegroundColor $Cyan
Write-Host "   \i database/types_and_functions.sql" -ForegroundColor $Cyan
Write-Host "   \i database/schema.sql" -ForegroundColor $Cyan
Write-Host ""
Write-Host "3. Or run the complete schema:" -ForegroundColor $Cyan
Write-Host "   \i database/schema.sql" -ForegroundColor $Cyan
Write-Host ""

Write-Host "Deployment completed successfully!" -ForegroundColor $Green