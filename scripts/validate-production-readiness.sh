#!/bin/bash
set -e

echo "=== Production Readiness Validation ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Helper function
check() {
    local name="$1"
    local command="$2"
    
    echo -n "Checking $name... "
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
        ((ERRORS++))
    fi
}

warn() {
    local name="$1"
    local message="$2"
    
    echo -e "${YELLOW}⚠${NC} $name: $message"
    ((WARNINGS++))
}

# 1. Check Project Structure
echo "1. Project Structure"
check "Platform API exists" "test -d cloudflare/platform-api"
check "Portal exists" "test -d cloudflare"
check "Docs directory exists" "test -d docs"

# 2. Check Configuration Files
echo ""
echo "2. Configuration Files"
check "package.json (platform-api)" "test -f cloudflare/platform-api/package.json"
check "package.json (portal)" "test -f cloudflare/package.json"
check "wrangler.toml (platform-api)" "test -f cloudflare/platform-api/wrangler.toml"
check "tsconfig.json (platform-api)" "test -f cloudflare/platform-api/tsconfig.json"

# 3. Check Source Files
echo ""
echo "3. Source Files"
check "ErrorHandler exists" "test -f cloudflare/platform-api/src/errors/ErrorHandler.ts"
check "ErrorCodes exists" "test -f cloudflare/platform-api/src/errors/ErrorCodes.ts"
check "TenantIsolation exists" "test -f cloudflare/platform-api/src/security/TenantIsolation.ts"
check "Optimizer exists" "test -f cloudflare/platform-api/src/performance/Optimizer.ts"

# 4. Check Test Configuration
echo ""
echo "4. Test Configuration"
check "vitest.config.ts exists" "test -f cloudflare/platform-api/vitest.config.ts"
check "tests/setup.ts exists" "test -f cloudflare/platform-api/tests/setup.ts"

# 5. Check Documentation
echo ""
echo "5. Documentation"
check "DEPLOYMENT.md exists" "test -f docs/ops/DEPLOYMENT.md"
check "MONITORING.md exists" "test -f docs/ops/MONITORING.md"
check "RUNBOOK.md exists" "test -f docs/ops/RUNBOOK.md"

# 6. Check Dependencies
echo ""
echo "6. Dependencies"
check "node_modules (platform-api) installed" "test -d cloudflare/platform-api/node_modules"
check "node_modules (portal) installed" "test -d cloudflare/node_modules"

# 7. Validate Package Scripts
echo ""
echo "7. Package Scripts"
check "test script exists" "grep -q '\"test\":' cloudflare/platform-api/package.json"
check "deploy script exists" "grep -q '\"deploy\":' cloudflare/platform-api/package.json"

# 8. Validate Wrangler Configuration
echo ""
echo "8. Wrangler Configuration"
check "D1 database configured" "grep -q 'd1_databases' cloudflare/platform-api/wrangler.toml"
check "KV namespace configured" "grep -q 'kv_namespaces' cloudflare/platform-api/wrangler.toml"
check "Durable Objects configured" "grep -q 'durable_objects' cloudflare/platform-api/wrangler.toml"
check "Observability enabled" "grep -q 'observability' cloudflare/platform-api/wrangler.toml"

# Summary
echo ""
echo "================================"
echo "Validation Summary"
echo "================================"
echo -e "Errors:   ${RED}$ERRORS${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All critical checks passed${NC}"
    exit 0
else
    echo -e "${RED}✗ Validation failed with $ERRORS error(s)${NC}"
    exit 1
fi