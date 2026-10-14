#!/bin/bash
# fix-deployment-issues.sh
# Fixes security vulnerabilities and deployment configuration issues

set -e

echo "🔧 Fixing Nube Auth deployment issues..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Update security vulnerabilities
echo "📦 Updating dependencies with security patches..."
echo ""

# Update Astro (RCE and XSS vulnerabilities)
echo "  - Updating Astro to fix RCE and XSS vulnerabilities..."
pnpm update astro@latest --filter "./apps/dashboard/home"

# Update React Router (XSS vulnerability)
echo "  - Updating React Router to fix XSS vulnerability..."
pnpm update react-router-dom@latest --filter "./apps/dashboard/admin"
pnpm update react-router-dom@latest --filter "./apps/dashboard/user"

# Update Hono (JWT algorithm confusion)
echo "  - Updating Hono to fix JWT vulnerability..."
pnpm update hono@latest --filter "./apps/packages/shared"

# Update tar (DoS vulnerability) - dev dependency
echo "  - Updating tar to fix DoS vulnerability..."
pnpm update @vercel/nft@latest --filter "./apps/dashboard/home" || echo "  ⚠️  tar update may require manual intervention"

echo ""
echo "${GREEN}✅ Dependencies updated${NC}"
echo ""

# 2. Fix pnpm override warning
echo "📝 Fixing pnpm overrides configuration..."
if ! grep -q "overrides.ioredis" .npmrc 2>/dev/null; then
    echo "" >> .npmrc
    echo "# Dependency overrides" >> .npmrc
    echo "overrides.ioredis=5.8.2" >> .npmrc
    echo "${GREEN}✅ Added override to .npmrc${NC}"
else
    echo "${YELLOW}⚠️  Override already exists in .npmrc${NC}"
fi

echo ""
echo "${YELLOW}⚠️  Manual step required: Remove 'pnpm.overrides' from package.json${NC}"
echo ""

# 3. Verify builds
echo "🏗️  Verifying builds..."
echo ""
pnpm build:packages
echo ""
echo "${GREEN}✅ Package builds successful${NC}"
echo ""

# 4. Run typecheck
echo "🔍 Running type checks..."
pnpm typecheck || echo "${RED}⚠️  Type check failed - review errors above${NC}"
echo ""

# 5. Run security audit
echo "🔐 Running security audit..."
echo ""
if pnpm audit --prod; then
    echo ""
    echo "${GREEN}✅ No vulnerabilities found!${NC}"
else
    echo ""
    echo "${YELLOW}⚠️  Some vulnerabilities remain - review output above${NC}"
    echo "    Run 'pnpm audit --prod' for details"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "${GREEN}✅ Automated fixes complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. ${YELLOW}Review changes:${NC} git status && git diff"
echo "  2. ${YELLOW}Update package.json:${NC} Remove the 'pnpm.overrides' section manually"
echo "  3. ${YELLOW}Test locally:${NC} pnpm dev"
echo "  4. ${YELLOW}Commit changes:${NC}"
echo "     git add ."
echo "     git commit -m \"fix: security vulnerabilities and deployment config\""
echo "  5. ${YELLOW}Push to staging:${NC}"
echo "     git push origin staging"
echo "  6. ${YELLOW}After testing, merge to trunk:${NC}"
echo "     git checkout trunk"
echo "     git merge staging --no-ff"
echo "     git push origin trunk"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
