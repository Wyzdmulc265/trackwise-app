#!/bin/bash
# Production Readiness Test Script for TrackWise
# Run this before deploying to Vercel
# Usage: bash test-production-ready.sh

set -e

echo "=========================================="
echo "TrackWise Production Readiness Test"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track test results
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    ((PASSED++))
}

fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    ((FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠ WARN${NC}: $1"
    ((WARNINGS++))
}

# Test 1: Node.js and npm versions
echo "📋 Checking Node.js and npm..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    pass "Node.js installed: $NODE_VERSION"
else
    fail "Node.js not found"
fi

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    pass "npm installed: $NPM_VERSION"
else
    fail "npm not found"
fi
echo ""

# Test 2: Check git status
echo "📋 Checking git status..."
if git rev-parse --git-dir > /dev/null 2>&1; then
    pass "Git repository initialized"
    
    # Check if .env is in gitignore
    if grep -q "^\.env$" .gitignore 2>/dev/null; then
        pass ".env is in .gitignore (secrets won't be committed)"
    else
        fail ".env is NOT in .gitignore - SECURITY RISK"
    fi
    
    # Check for uncommitted secrets
    if grep -r "change-in-production\|changeme\|your-secret" . --include="*.ts" --include="*.js" 2>/dev/null | grep -v node_modules | grep -v ".git" > /dev/null; then
        warn "Possible placeholder secrets found in code"
    else
        pass "No obvious placeholder secrets in code"
    fi
else
    fail "Not a git repository"
fi
echo ""

# Test 3: Check required files exist
echo "📋 Checking required files..."
REQUIRED_FILES=("package.json" "tsconfig.json" "tsconfig.server.json" "vite.config.ts" "vercel.json" "server/index.ts" "database/schema.sql")

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        pass "Found: $file"
    else
        fail "Missing: $file"
    fi
done
echo ""

# Test 4: Check dependencies
echo "📋 Checking dependencies..."
if [ -d "node_modules" ]; then
    pass "node_modules directory exists"
else
    warn "node_modules not found - run 'npm install' before testing"
fi

# Check for required packages
REQUIRED_PACKAGES=("express" "react" "vite" "pg" "jsonwebtoken" "helmet" "cors")
for package in "${REQUIRED_PACKAGES[@]}"; do
    if grep -q "\"$package\"" package.json; then
        pass "Dependency found: $package"
    else
        fail "Missing dependency: $package"
    fi
done
echo ""

# Test 5: TypeScript compilation
echo "📋 Testing TypeScript compilation..."
if npm run type-check > /dev/null 2>&1; then
    pass "Frontend TypeScript compiles"
else
    fail "Frontend TypeScript compilation failed"
fi

if npm run type-check:server > /dev/null 2>&1; then
    pass "Backend TypeScript compiles"
else
    fail "Backend TypeScript compilation failed"
fi
echo ""

# Test 6: Build test
echo "📋 Testing production build..."
echo "  (This may take 1-2 minutes...)"

# Clean previous build
rm -rf dist 2>/dev/null || true

if npm run build > /tmp/build.log 2>&1; then
    pass "Build completed successfully"
    
    # Check build output
    if [ -f "dist/index.html" ]; then
        pass "Frontend bundle created: dist/index.html"
    else
        fail "Frontend bundle not found at dist/index.html"
    fi
    
    if [ -f "dist/server/index.js" ]; then
        pass "Backend bundle created: dist/server/index.js"
    else
        fail "Backend bundle not found at dist/server/index.js"
    fi
    
    # Check dist size (warning if too large)
    DIST_SIZE=$(du -sh dist | cut -f1)
    pass "Build output size: $DIST_SIZE"
else
    fail "Build failed - see /tmp/build.log for details"
    tail -20 /tmp/build.log
fi
echo ""

# Test 7: Environment variables
echo "📋 Checking environment variables..."
if [ -f ".env" ]; then
    pass ".env file exists"
    
    # Check for required env vars
    REQUIRED_ENV=("DATABASE_URL" "JWT_SECRET" "JWT_REFRESH_SECRET" "CORS_ORIGIN")
    for env in "${REQUIRED_ENV[@]}"; do
        if grep -q "^${env}=" .env; then
            pass "Found env variable: $env"
        else
            warn "Missing env variable: $env"
        fi
    done
else
    warn ".env file not found - you'll need to create it or configure in Vercel"
fi

# Check .env.production template
if [ -f ".env.production" ]; then
    pass ".env.production template exists"
else
    fail "Missing .env.production template"
fi
echo ""

# Test 8: Database connectivity (if DATABASE_URL is set)
echo "📋 Checking database connectivity..."
if [ -f ".env" ] && grep -q "^DATABASE_URL=" .env; then
    # Source the .env file
    set -a
    source .env
    set +a
    
    if [ -z "$DATABASE_URL" ]; then
        warn "DATABASE_URL is empty - database test skipped"
    else
        # Try to connect (requires psql installed)
        if command -v psql &> /dev/null; then
            if psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
                pass "Database connection successful"
                
                # Check if schema exists
                TABLES=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")
                if [ "$TABLES" -gt 0 ]; then
                    pass "Database schema exists ($TABLES tables found)"
                else
                    warn "Database appears empty - you'll need to run schema migrations"
                fi
            else
                warn "Cannot connect to database - check DATABASE_URL and PostgreSQL is running"
            fi
        else
            warn "psql not installed - database connectivity test skipped"
        fi
    fi
else
    warn "DATABASE_URL not configured - configure in Vercel environment variables"
fi
echo ""

# Test 9: Configuration validation
echo "📋 Validating configuration..."

# Check vercel.json
if grep -q "\"buildCommand\"" vercel.json; then
    pass "vercel.json has buildCommand"
else
    fail "vercel.json missing buildCommand"
fi

if grep -q "\"env\"" vercel.json; then
    pass "vercel.json has env configuration"
else
    fail "vercel.json missing env configuration"
fi

# Check package.json build script
if grep -q "\"build\":" package.json; then
    pass "package.json has build script"
else
    fail "package.json missing build script"
fi

if grep -q "\"start\":" package.json; then
    pass "package.json has start script"
else
    fail "package.json missing start script"
fi
echo ""

# Test 10: Security checks
echo "📋 Running security checks..."

# Check for hardcoded secrets
if grep -r "hardcoded\|fixme\|todo.*secret" . --include="*.ts" --include="*.js" 2>/dev/null | grep -v node_modules | grep -v ".git" > /dev/null; then
    warn "Potential security TODOs found in code"
else
    pass "No obvious security warnings in code"
fi

# Check helmet middleware
if grep -q "helmet" server/index.ts; then
    pass "Security middleware (Helmet) configured"
else
    fail "Helmet middleware not found"
fi

# Check CORS middleware
if grep -q "cors" server/index.ts; then
    pass "CORS middleware configured"
else
    fail "CORS middleware not found"
fi

# Check rate limiting
if grep -q "rateLimit" server/index.ts; then
    pass "Rate limiting configured"
else
    fail "Rate limiting not found"
fi
echo ""

# Test 11: Lint check
echo "📋 Running linter..."
if npm run lint 2>&1 | grep -q "error"; then
    warn "TypeScript linting found issues"
else
    pass "TypeScript linting passed"
fi
echo ""

# Test 12: Run tests (if any)
echo "📋 Running tests..."
if npm run test > /tmp/test.log 2>&1; then
    pass "Tests passed"
else
    warn "Tests failed or not configured - see /tmp/test.log"
fi
echo ""

# Summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo ""

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}❌ NOT READY FOR PRODUCTION${NC}"
    echo "Fix the $FAILED failure(s) above before deploying to Vercel"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️ READY WITH CAUTION${NC}"
    echo "Review the $WARNINGS warning(s) above before deploying"
    exit 0
else
    echo -e "${GREEN}✅ READY FOR PRODUCTION${NC}"
    echo "Your app is ready to deploy to Vercel!"
    exit 0
fi
