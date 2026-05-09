# Test Neon PostgreSQL Connection
# Run this after setting DATABASE_URL to your Neon connection string

param(
    [string]$ConnectionString
)

if (-not $ConnectionString) {
    # Try to read from .env or environment
    if (Test-Path ".env") {
        $envContent = Get-Content ".env"
        foreach ($line in $envContent) {
            if ($line -match "^DATABASE_URL=(.+)$") {
                $ConnectionString = $Matches[1]
                break
            }
        }
    }
}

if (-not $ConnectionString) {
    Write-Host "Usage: .\test-neon-connection.ps1 -ConnectionString 'postgres://...'" -ForegroundColor Yellow
    Write-Host "Or set DATABASE_URL in .env file" -ForegroundColor Yellow
    exit 1
}

Write-Host "Testing connection to Neon..." -ForegroundColor Cyan
Write-Host "Host: $($ConnectionString -replace '^postgres://[^:]+:[^@]+@([^/]+).*', '$1')" -ForegroundColor Gray

try {
    $result = psql $ConnectionString -c "SELECT version();" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✓ Connection successful!" -ForegroundColor Green
        Write-Host $result -ForegroundColor Gray
        
        # Test query
        Write-Host "`nTesting schema access..." -ForegroundColor Cyan
        $tables = psql $ConnectionString -c "\dt" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Can list tables:" -ForegroundColor Green
            Write-Host $tables -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "`n✗ Connection failed!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n✓ Neon PostgreSQL is ready for TrackWise!" -ForegroundColor Green
