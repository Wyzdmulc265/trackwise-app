# Production Readiness Test Script for TrackWise (PowerShell)
# Run this before deploying to Vercel
# Usage: .\test-production-ready.ps1

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "TrackWise Production Readiness Test" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$PASSED = 0
$FAILED = 0
$WARNINGS = 0

function Pass {
    param([string]$Message)
    Write-Host "✓ PASS: $Message" -ForegroundColor Green
    $global:PASSED++
}

function Fail {
    param([string]$Message)
    Write-Host "✗ FAIL: $Message" -ForegroundColor Red
    $global:FAILED++
}

function Warn {
    param([string]$Message)
    Write-Host "⚠ WARN: $Message" -ForegroundColor Yellow
    $global:WARNINGS++
}

# Test 1: Node.js and npm versions
Write-Host "📋 Checking Node.js and npm..." -ForegroundColor Blue
try {
    $NODE_VERSION = node -v
    Pass "Node.js installed: $NODE_VERSION"
} catch {
    Fail "Node.js not found"
}

try {
    $NPM_VERSION = npm -v
    Pass "npm installed: $NPM_VERSION"
} catch {
    Fail "npm not found"
}
Write-Host ""

# Test 2: Check git status
Write-Host "📋 Checking git status..." -ForegroundColor Blue
try {
    git rev-parse --git-dir > $null 2>&1
    Pass "Git repository initialized"
    
    # Check if .env is in gitignore
    $gitignore = Get-Content .gitignore -ErrorAction SilentlyContinue
    if ($gitignore -match '\.env$') {
        Pass ".env is in .gitignore (secrets won't be committed)"
    } else {
        Fail ".env is NOT in .gitignore - SECURITY RISK"
    }
    
    # Check for uncommitted secrets
    $secrets = Get-ChildItem -Path . -Include "*.ts", "*.js" -Recurse -ErrorAction SilentlyContinue | 
               Select-String "change-in-production|changeme|your-secret" -ErrorAction SilentlyContinue | 
               Where-Object { $_.Path -notlike "*node_modules*" -and $_.Path -notlike "*.git*" }
    
    if ($secrets) {
        Warn "Possible placeholder secrets found in code"
    } else {
        Pass "No obvious placeholder secrets in code"
    }
} catch {
    Fail "Git repository check failed"
}
Write-Host ""

# Test 3: Check required files exist
Write-Host "📋 Checking required files..." -ForegroundColor Blue
$REQUIRED_FILES = @("package.json", "tsconfig.json", "tsconfig.server.json", "vite.config.ts", "vercel.json", "server/index.ts", "database/schema.sql")

foreach ($file in $REQUIRED_FILES) {
    if (Test-Path $file) {
        Pass "Found: $file"
    } else {
        Fail "Missing: $file"
    }
}
Write-Host ""

# Test 4: Check dependencies
Write-Host "📋 Checking dependencies..." -ForegroundColor Blue
if (Test-Path "node_modules") {
    Pass "node_modules directory exists"
} else {
    Warn "node_modules not found - run 'npm install' before testing"
}

$packageJson = Get-Content package.json | ConvertFrom-Json
$REQUIRED_PACKAGES = @("express", "react", "vite", "pg", "jsonwebtoken", "helmet", "cors")

foreach ($package in $REQUIRED_PACKAGES) {
    if ($packageJson.dependencies.$package -or $packageJson.devDependencies.$package) {
        Pass "Dependency found: $package"
    } else {
        Fail "Missing dependency: $package"
    }
}
Write-Host ""

# Test 5: TypeScript compilation
Write-Host "📋 Testing TypeScript compilation..." -ForegroundColor Blue
try {
    $output = npm run type-check 2>&1
    Pass "Frontend TypeScript compiles"
} catch {
    Fail "Frontend TypeScript compilation failed"
}

try {
    $output = npm run type-check:server 2>&1
    Pass "Backend TypeScript compiles"
} catch {
    Fail "Backend TypeScript compilation failed"
}
Write-Host ""

# Test 6: Build test
Write-Host "📋 Testing production build..." -ForegroundColor Blue
Write-Host "  (This may take 1-2 minutes...)" -ForegroundColor Gray

# Clean previous build
Remove-Item -Path "dist" -Recurse -ErrorAction SilentlyContinue

try {
    npm run build 2>&1 | Out-Null
    Pass "Build completed successfully"
    
    # Check build output
    if (Test-Path "dist/index.html") {
        Pass "Frontend bundle created: dist/index.html"
    } else {
        Fail "Frontend bundle not found at dist/index.html"
    }
    
    if (Test-Path "dist/server/index.js") {
        Pass "Backend bundle created: dist/server/index.js"
    } else {
        Fail "Backend bundle not found at dist/server/index.js"
    }
    
    # Check dist size
    $distSize = (Get-ChildItem -Path "dist" -Recurse | Measure-Object -Property Length -Sum).Sum
    $distSizeMB = [Math]::Round($distSize / 1MB, 2)
    Pass "Build output size: $distSizeMB MB"
} catch {
    Fail "Build failed"
}
Write-Host ""

# Test 7: Environment variables
Write-Host "📋 Checking environment variables..." -ForegroundColor Blue
if (Test-Path ".env") {
    Pass ".env file exists"
    
    $env_content = Get-Content ".env"
    $REQUIRED_ENV = @("DATABASE_URL", "JWT_SECRET", "JWT_REFRESH_SECRET", "CORS_ORIGIN")
    
    foreach ($env in $REQUIRED_ENV) {
        if ($env_content -match "^${env}=") {
            Pass "Found env variable: $env"
        } else {
            Warn "Missing env variable: $env"
        }
    }
} else {
    Warn ".env file not found - you'll need to create it or configure in Vercel"
}

# Check .env.production template
if (Test-Path ".env.production") {
    Pass ".env.production template exists"
} else {
    Fail "Missing .env.production template"
}
Write-Host ""

# Test 8: Configuration validation
Write-Host "📋 Validating configuration..." -ForegroundColor Blue

$vercelJson = Get-Content vercel.json | ConvertFrom-Json
if ($vercelJson.buildCommand) {
    Pass "vercel.json has buildCommand"
} else {
    Fail "vercel.json missing buildCommand"
}

if ($vercelJson.env) {
    Pass "vercel.json has env configuration"
} else {
    Fail "vercel.json missing env configuration"
}

if ($packageJson.scripts.build) {
    Pass "package.json has build script"
} else {
    Fail "package.json missing build script"
}

if ($packageJson.scripts.start) {
    Pass "package.json has start script"
} else {
    Fail "package.json missing start script"
}
Write-Host ""

# Test 9: Security checks
Write-Host "📋 Running security checks..." -ForegroundColor Blue

$serverContent = Get-Content "server/index.ts" -Raw -ErrorAction SilentlyContinue

if ($serverContent -match "helmet") {
    Pass "Security middleware (Helmet) configured"
} else {
    Fail "Helmet middleware not found"
}

if ($serverContent -match "cors") {
    Pass "CORS middleware configured"
} else {
    Fail "CORS middleware not found"
}

if ($serverContent -match "rateLimit") {
    Pass "Rate limiting configured"
} else {
    Fail "Rate limiting not found"
}
Write-Host ""

# Test 10: Lint check
Write-Host "📋 Running linter..." -ForegroundColor Blue
try {
    $lintOutput = npm run lint 2>&1
    if ($lintOutput -match "error") {
        Warn "TypeScript linting found issues"
    } else {
        Pass "TypeScript linting passed"
    }
} catch {
    Warn "Lint check failed"
}
Write-Host ""

# Summary
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Passed: $PASSED" -ForegroundColor Green
Write-Host "Failed: $FAILED" -ForegroundColor Red
Write-Host "Warnings: $WARNINGS" -ForegroundColor Yellow
Write-Host ""

if ($FAILED -gt 0) {
    Write-Host "❌ NOT READY FOR PRODUCTION" -ForegroundColor Red
    Write-Host "Fix the $FAILED failure(s) above before deploying to Vercel" -ForegroundColor Red
    exit 1
} elseif ($WARNINGS -gt 0) {
    Write-Host "⚠️ READY WITH CAUTION" -ForegroundColor Yellow
    Write-Host "Review the $WARNINGS warning(s) above before deploying" -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "✅ READY FOR PRODUCTION" -ForegroundColor Green
    Write-Host "Your app is ready to deploy to Vercel!" -ForegroundColor Green
    exit 0
}
