#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Setup TrackWise PostgreSQL database locally
.DESCRIPTION
    This script creates the TrackWise database, user, and loads the schema
.PARAMETER PostgresPassword
    The password for the 'postgres' superuser
.PARAMETER Host
    PostgreSQL server host (default: localhost)
.PARAMETER Port
    PostgreSQL server port (default: 5432)
.EXAMPLE
    .\setup-local-postgres.ps1 -PostgresPassword "your_postgres_password"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$PostgresPassword,

    [Parameter(Mandatory=$false)]
    [string]$PgHost = "localhost",

    [Parameter(Mandatory=$false)]
    [int]$Port = 5432,

    [Parameter(Mandatory=$false)]
    [string]$TrackwisePassword = "trackwise_secure_123"
)


# Check if psql is available
try {
    $psqlVersion = psql --version 2>&1
    Write-Host "OK Found PostgreSQL: $psqlVersion" -ForegroundColor Green
}
catch {
    Write-Host "FAIL PostgreSQL (psql) not found in PATH" -ForegroundColor Red
    Write-Host "Please install PostgreSQL from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

Write-Host "INFO Setting up TrackWise PostgreSQL Database" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Test connection
Write-Host "Testing connection to PostgreSQL..." -ForegroundColor Yellow
try {
    $env:PGPASSWORD = $PostgresPassword
    $testConnection = & psql -U postgres -h "localhost" -p $Port -c "SELECT version();" 2>&1
    if ($testConnection -match "PostgreSQL") {
        Write-Host "OK Successfully connected to PostgreSQL" -ForegroundColor Green
    } else {
        throw "Connection test failed"
    }
}
catch {
    Write-Host "FAIL Failed to connect to PostgreSQL" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting steps:" -ForegroundColor Yellow
    Write-Host "1. Verify PostgreSQL service is running: Get-Service postgres*" -ForegroundColor Yellow
    Write-Host "2. Check the postgres password is correct" -ForegroundColor Yellow
    Write-Host "3. Ensure PostgreSQL is listening on $Host`:$Port" -ForegroundColor Yellow
    exit 1
}

# Create database
Write-Host ""
Write-Host "Creating 'trackwise' database..." -ForegroundColor Yellow
try {
    psql -U postgres -h "localhost" -p $Port -c "CREATE DATABASE trackwise;" 2>&1 | ForEach-Object {
        if ($_ -notmatch "already exists") { Write-Host $_ -ForegroundColor Gray }
    }
    Write-Host "OK Database ready" -ForegroundColor Green
}
catch {
    Write-Host "Warning: $_" -ForegroundColor Yellow
}

# Create user
Write-Host ""
Write-Host "Creating 'trackwise_admin' user..." -ForegroundColor Yellow
try {
    psql -U postgres -h "localhost" -p $Port -c "CREATE USER trackwise_admin WITH ENCRYPTED PASSWORD '$TrackwisePassword';" 2>&1 | ForEach-Object {
        if ($_ -notmatch "already exists") { Write-Host $_ -ForegroundColor Gray }
    }
    Write-Host "OK User created" -ForegroundColor Green
}
catch {
    Write-Host "Warning: $_" -ForegroundColor Yellow
}

# Grant privileges
Write-Host ""
Write-Host "Granting privileges..." -ForegroundColor Yellow
try {
    psql -U postgres -h "localhost" -p $Port -c "GRANT ALL PRIVILEGES ON DATABASE trackwise TO trackwise_admin;"
    psql -U postgres -h "localhost" -p $Port -d trackwise -c "GRANT ALL ON SCHEMA public TO trackwise_admin;"
    Write-Host "OK Privileges granted" -ForegroundColor Green
}
catch {
    Write-Host "Warning: $_" -ForegroundColor Yellow
}

# Load schema
Write-Host ""
Write-Host "Loading database schema..." -ForegroundColor Yellow
$schemaFile = ".\database\schema.sql"
if (Test-Path $schemaFile) {
    try {
        $env:PGPASSWORD = $TrackwisePassword
        psql -U trackwise_admin -h "localhost" -p $Port -d trackwise -f $schemaFile
        Write-Host "OK Schema loaded successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "FAIL Failed to load schema: $_" -ForegroundColor Red
        exit 1
    }
}
else {
    Write-Host "FAIL Schema file not found: $schemaFile" -ForegroundColor Red
    exit 1
}

# Optional: Load sample data
Write-Host ""
$loadSamples = Read-Host "Load sample data for testing? (y/n)"
if ($loadSamples -eq "y" -or $loadSamples -eq "Y") {
    $sampleFile = ".\database\sample_data.sql"
    if (Test-Path $sampleFile) {
        Write-Host "Loading sample data..." -ForegroundColor Yellow
        try {
            $env:PGPASSWORD = $TrackwisePassword
            psql -U trackwise_admin -h "localhost" -p $Port -d trackwise -f $sampleFile
            Write-Host "OK Sample data loaded" -ForegroundColor Green
        }
        catch {
            Write-Host "Warning: Could not load sample data: $_" -ForegroundColor Yellow
        }
    }
}

# Verify setup
Write-Host ""
Write-Host "Verifying installation..." -ForegroundColor Yellow
try {
    $env:PGPASSWORD = $TrackwisePassword
    $tableCount = psql -U trackwise_admin -h "localhost" -p $Port -d trackwise -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
    $tableCount = $tableCount.Trim()
    Write-Host "OK Found $tableCount tables in database" -ForegroundColor Green
}
catch {
    Write-Host "Warning: Could not verify: $_" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "OK TrackWise Database Setup Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Connection Details:" -ForegroundColor Cyan
Write-Host "  Host:     localhost"
Write-Host "  Port:     $Port"
Write-Host "  Database: trackwise"
Write-Host "  Username: trackwise_admin"
Write-Host "  Password: $TrackwisePassword"
Write-Host ""
Write-Host "Connection String (Node.js):" -ForegroundColor Cyan
Write-Host "  postgresql://trackwise_admin:$TrackwisePassword@localhost`:$Port/trackwise"
Write-Host ""
Write-Host "Test Connection:" -ForegroundColor Cyan
    Write-Host "  psql -U trackwise_admin -h localhost -d trackwise -c '\dt'"
Write-Host ""

# Clean up
Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
