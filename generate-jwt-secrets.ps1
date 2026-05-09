# Generate secure JWT secrets for TrackWise production
# Run this script and copy the output to your .env.production file

Write-Host "TrackWise JWT Secret Generator" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Green
Write-Host ""

# Check if OpenSSL is available
$openssl = Get-Command openssl -ErrorAction SilentlyContinue

if ($openssl) {
    Write-Host "Using OpenSSL for cryptographically secure random generation..." -ForegroundColor Cyan
    
    # Generate JWT_SECRET (64 bytes = 512 bits)
    $jwtSecret = openssl rand -base64 64
    
    # Generate JWT_REFRESH_SECRET (64 bytes = 512 bits)
    $jwtRefreshSecret = openssl rand -base64 64
    
} else {
    Write-Warning "OpenSSL not found. Using PowerShell's built-in RNG (still secure)..."
    
    # Generate 64 random bytes and encode as base64
    $bytes = New-Object byte[] 64
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $jwtSecret = [Convert]::ToBase64String($bytes)
    
    $bytes2 = New-Object byte[] 64
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes2)
    $jwtRefreshSecret = [Convert]::ToBase64String($bytes2)
}

# Trim potential trailing newlines
$jwtSecret = $jwtSecret.Trim()
$jwtRefreshSecret = $jwtRefreshSecret.Trim()

Write-Host "Generated secrets (copy these to .env.production):" -ForegroundColor Yellow
Write-Host ""
Write-Host "JWT_SECRET=$jwtSecret" -ForegroundColor Green
Write-Host ""
Write-Host "JWT_REFRESH_SECRET=$jwtRefreshSecret" -ForegroundColor Green
Write-Host ""

# Verify lengths
Write-Host "Validation:" -ForegroundColor Cyan
Write-Host "  JWT_SECRET length: $($jwtSecret.Length) characters" -ForegroundColor Gray
Write-Host "  JWT_REFRESH_SECRET length: $($jwtRefreshSecret.Length) characters" -ForegroundColor Gray

if ($jwtSecret.Length -ge 32 -and $jwtRefreshSecret.Length -ge 32) {
    Write-Host "  ✓ Both secrets meet minimum length requirement (32 chars)" -ForegroundColor Green
} else {
    Write-Host "  ✗ WARNING: One or both secrets are too short!" -ForegroundColor Red
}

Write-Host ""
Write-Host "IMPORTANT:" -ForegroundColor Yellow
Write-Host "1. These secrets are generated ONCE — save them securely" -ForegroundColor Yellow
Write-Host "2. If you lose them, all existing JWTs become invalid" -ForegroundColor Yellow
Write-Host "3. Never share these values or commit them to git" -ForegroundColor Yellow
Write-Host "4. Use DIFFERENT values in production vs development" -ForegroundColor Yellow
Write-Host ""
Write-Host "Add both lines to your Render environment variables or .env.production file." -ForegroundColor Cyan
