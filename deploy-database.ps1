# TrackWise Neon PostgreSQL Deployment Script
# PowerShell version for Windows deployment to Neon

param(
    [Parameter(Mandatory=$true)]
    [string]$NeonConnectionString,

    [Parameter(Mandatory=$false)]
    [switch]$LoadSampleData
)

# Colors for output
$consoleColors = @{
    Green  = "Green"
    Yellow = "Yellow"
    Red    = "Red"
    Cyan   = "Cyan"
    White  = "White"
    Gray   = "Gray"
}

function Write-Info($message) { Write-Host $message -ForegroundColor $consoleColors.Cyan }
function Write-Success($message) { Write-Host $message -ForegroundColor $consoleColors.Green }
function Write-Warning($message) { Write-Host $message -ForegroundColor $consoleColors.Yellow }
function Write-ErrorMsg($message) { Write-Host $message -ForegroundColor $consoleColors.Red }

Write-Host "TrackWise Neon Database Deployment Script" -ForegroundColor $consoleColors.Green
Write-Host "=========================================" -ForegroundColor $consoleColors.Green

# Check if psql is available
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    Write-ErrorMsg "Error: psql command not found. Please install PostgreSQL client tools."
    Write-Warning "Download from: https://www.postgresql.org/download/windows/"
    Write-Warning "Or install via Chocolatey: choco install postgresql16"
    exit 1
}

# Ensure PostgreSQL bin is in PATH for SSL libs
$psqlDir = Split-Path $psqlPath.Path -Parent
$env:Path = "$psqlDir;$env:Path"

# Normalize and validate connection string
# Convert postgresql:// to postgres:// (psql expects postgres://)
if ($NeonConnectionString -like "postgresql://*") {
    $NeonConnectionString = $NeonConnectionString -replace "postgresql://", "postgres://"
}
# Remove channel_binding parameter if present (not needed for psql)
$NeonConnectionString = $NeonConnectionString -replace '([?&])channel_binding=require(&|$)', '$1'
$NeonConnectionString = $NeonConnectionString -replace '[?&]$', ''

# Validate format
if ($NeonConnectionString -notmatch "^postgres://") {
    Write-ErrorMsg "Error: Connection string must start with 'postgres://'"
    Write-Warning "Get the correct format from Neon dashboard (psql format)"
    exit 1
}

Write-Info "Connecting to Neon PostgreSQL database..."

# Extract and verify hostname
if ($NeonConnectionString -match "postgres://[^:]+:[^@]+@([^/]+)") {
    $hostname = $Matches[1]
    Write-Host "Target host: $hostname" -ForegroundColor $consoleColors.Gray

    try {
        $ipResult = [System.Net.Dns]::GetHostAddresses($hostname) 2>$null
        if ($ipResult) {
            Write-Success "✓ DNS resolved to: $($ipResult.IPAddressToString -join ', ')"
        } else {
            Write-ErrorMsg "✗ DNS resolution failed for $hostname"
            Write-Warning "Possible causes:"
            Write-Host "  1. Incorrect hostname (should end with .neon.tech)" -ForegroundColor $consoleColors.Yellow
            Write-Host "  2. Network/firewall blocking DNS" -ForegroundColor $consoleColors.Yellow
            Write-Host "  3. Internet connectivity issue" -ForegroundColor $consoleColors.Yellow
            Write-Info "Solutions:"
            Write-Host "  - Verify connection string in Neon dashboard" -ForegroundColor $consoleColors.White
            Write-Host "  - Test: nslookup $hostname" -ForegroundColor $consoleColors.White
            Write-Host "  - Try a different network (mobile hotspot)" -ForegroundColor $consoleColors.White
            exit 1
        }
    } catch {
        Write-Warning "Could not verify DNS: $_"
    }
}

# Test connection
Write-Info "Testing database connection..."
try {
    $testResult = & psql $NeonConnectionString -c "SELECT version();" --no-psqlrc 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMsg "✗ Connection failed (exit code: $LASTEXITCODE)"
        Write-Host "Output:" -ForegroundColor $consoleColors.Yellow
        Write-Host $testResult -ForegroundColor $consoleColors.Red
        Write-Info "Troubleshooting:"
        Write-Host "  1. Verify connection string in Neon dashboard" -ForegroundColor $consoleColors.White
        Write-Host "  2. Check password (special chars may need URL encoding)" -ForegroundColor $consoleColors.White
        Write-Host "  3. Ensure database is active in Neon console" -ForegroundColor $consoleColors.White
        Write-Host "  4. Try manually: psql `"$NeonConnectionString`"" -ForegroundColor $consoleColors.White
        exit 1
    }
    Write-Success "✓ Connected successfully"
    Write-Host $testResult -ForegroundColor $consoleColors.Gray
} catch {
    Write-ErrorMsg "✗ Connection error: $_"
    exit 1
}

# Get project directory
$scriptPath = $PSScriptRoot
if (-not $scriptPath) { $scriptPath = $PWD.Path }

# Apply types and functions
$typesFile = Join-Path $scriptPath "database/types_and_functions.sql"
if (Test-Path $typesFile) {
    Write-Info "Applying custom types and functions..."
    try {
        psql $NeonConnectionString -f $typesFile 2>&1 | Out-Host
        Write-Success "✓ Types and functions applied"
    } catch {
        Write-Warning "Warning: Could not apply types_and_functions.sql: $_"
    }
} else {
    Write-Warning "Skipping types_and_functions.sql (not found)"
}

# Apply main schema
$schemaFile = Join-Path $scriptPath "database/schema.sql"
if (-not (Test-Path $schemaFile)) {
    Write-ErrorMsg "Error: schema.sql not found at $schemaFile"
    exit 1
}

Write-Info "Applying database schema..."
try {
    psql $NeonConnectionString -f $schemaFile 2>&1 | Out-Host
    Write-Success "✓ Schema applied successfully"
} catch {
    Write-ErrorMsg "Error: Failed to apply schema: $_"
    exit 1
}

# Load sample data if requested
if ($LoadSampleData) {
    $sampleFile = Join-Path $scriptPath "database/sample_data.sql"
    if (Test-Path $sampleFile) {
        Write-Info "Loading sample data..."
        try {
            psql $NeonConnectionString -f $sampleFile 2>&1 | Out-Host
            Write-Success "✓ Sample data loaded"
        } catch {
            Write-Warning "Warning: Could not load sample data: $_"
        }
    } else {
        Write-Warning "Skipping sample_data.sql (not found)"
    }
}

# Summary
Write-Host ""
Write-Success "Neon PostgreSQL Database Ready!"
Write-Host "================================" -ForegroundColor $consoleColors.Green
Write-Host "Connection String: $NeonConnectionString" -ForegroundColor $consoleColors.Cyan
Write-Host ""
Write-Info "Next steps:"
Write-Host "1. Update environment variables (.env.production or Render dashboard):" -ForegroundColor $consoleColors.Cyan
Write-Host "   DATABASE_URL=$NeonConnectionString" -ForegroundColor $consoleColors.White
Write-Host ""
Write-Host "2. Set these additional variables:" -ForegroundColor $consoleColors.Cyan
Write-Host "   NODE_ENV=production" -ForegroundColor $consoleColors.White
Write-Host "   JWT_SECRET=<openssl rand -base64 64>" -ForegroundColor $consoleColors.White
Write-Host "   JWT_REFRESH_SECRET=<openssl rand -base64 64>" -ForegroundColor $consoleColors.White
Write-Host "   CORS_ORIGIN=https://your-frontend.onrender.com" -ForegroundColor $consoleColors.White
Write-Host "   VITE_API_URL=https://your-backend.onrender.com/api" -ForegroundColor $consoleColors.White
Write-Host ""
Write-Host "3. Rebuild and redeploy:" -ForegroundColor $consoleColors.Cyan
Write-Host "   npm run build" -ForegroundColor $consoleColors.White
Write-Host ""
Write-Success "Schema loaded! Neon is ready for TrackWise."
