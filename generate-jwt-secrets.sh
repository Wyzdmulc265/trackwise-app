# Generate secure JWT secrets for TrackWise production
# Bash version for Linux/macOS/WSL

#!/bin/bash

echo "TrackWise JWT Secret Generator"
echo "=============================="
echo ""

# Check if OpenSSL is available
if command -v openssl &> /dev/null; then
    echo "Using OpenSSL for cryptographically secure random generation..." >&2
    JWT_SECRET=$(openssl rand -base64 64)
    JWT_REFRESH_SECRET=$(openssl rand -base64 64)
else
    echo "Warning: OpenSSL not found. Using /dev/urandom..." >&2
    JWT_SECRET=$(head -c 64 /dev/urandom | base64)
    JWT_REFRESH_SECRET=$(head -c 64 /dev/urandom | base64)
fi

# Trim whitespace
JWT_SECRET=$(echo "$JWT_SECRET" | tr -d '[:space:]')
JWT_REFRESH_SECRET=$(echo "$JWT_REFRESH_SECRET" | tr -d '[:space:]')

echo "Generated secrets (copy these to .env.production):" >&2
echo "" >&2
echo "JWT_SECRET=$JWT_SECRET" >&2
echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET" >&2
echo "" >&2

# Validation
echo "Validation:" >&2
echo "  JWT_SECRET length: ${#JWT_SECRET} characters" >&2
echo "  JWT_REFRESH_SECRET length: ${#JWT_REFRESH_SECRET} characters" >&2

if [ ${#JWT_SECRET} -ge 32 ] && [ ${#JWT_REFRESH_SECRET} -ge 32 ]; then
    echo "  ✓ Both secrets meet minimum length requirement (32 chars)" >&2
else
    echo "  ✗ WARNING: One or both secrets are too short!" >&2
fi

echo "" >&2
echo "IMPORTANT:" >&2
echo "1. These secrets are generated ONCE — save them securely" >&2
echo "2. If you lose them, all existing JWTs become invalid" >&2
echo "3. Never share these values or commit them to git" >&2
echo "4. Use DIFFERENT values in production vs development" >&2
echo "" >&2
echo "Add both lines to your Render environment variables or .env.production file." >&2

# Also print to stdout for easy copying
echo ""
echo "# Copy these to your .env.production:"
echo "JWT_SECRET=$JWT_SECRET"
echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"
