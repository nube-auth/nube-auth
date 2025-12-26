#!/bin/bash
# Proofa Core - Build Verification Script
# Run this to verify all components are built and ready

set -e

echo "🔍 Proofa Core - Build Verification"
echo "===================================="
echo ""

# Count TypeScript files
echo "📊 File Statistics:"
echo "  TypeScript files: $(find . -name '*.ts' -o -name '*.tsx' | grep -v node_modules | wc -l)"
echo "  Package.json files: $(find . -name 'package.json' | grep -v node_modules | wc -l)"
echo ""

# Check key packages
echo "📦 Package Status:"
packages=("packages/shared" "packages/db" "packages/auth" "packages/redis" "apps/core" "apps/gateway" "apps/user-dashboard" "apps/admin-dashboard")

for pkg in "${packages[@]}"; do
  if [ -f "$pkg/package.json" ]; then
    echo "  ✅ $pkg"
  else
    echo "  ❌ $pkg (missing package.json)"
  fi
done
echo ""

# Check for key source files
echo "🔧 Key Files:"
files=(
  "packages/shared/src/id.ts:ID Generator"
  "packages/shared/src/types/index.ts:Type Definitions"
  "packages/shared/src/constants/index.ts:Constants"
  "packages/db/src/schema.ts:Database Schema"
  "packages/db/src/queries.ts:Database Queries"
  "packages/auth/src/oauth.ts:OAuth Adapters"
  "packages/auth/src/crypto.ts:Crypto Utilities"
  "packages/auth/src/session.ts:Session Management"
  "packages/redis/src/client.ts:Redis Client"
  "apps/core/src/index.ts:Core App"
  "apps/core/src/routes/v1/auth/index.ts:Core Auth Routes"
  "apps/core/src/routes/v1/email/index.ts:Core Email Routes"
  "apps/gateway/src/index.ts:Gateway App"
  "apps/gateway/src/routes/auth.ts:Gateway Auth Routes"
  "apps/gateway/src/routes/me.ts:Gateway Me Routes"
  "apps/gateway/src/routes/admin.ts:Gateway Admin Routes"
  "apps/user-dashboard/src/App.tsx:User Dashboard"
  "apps/admin-dashboard/src/App.tsx:Admin Dashboard"
)

for file_desc in "${files[@]}"; do
  file="${file_desc%:*}"
  desc="${file_desc#*:}"
  if [ -f "$file" ]; then
    lines=$(wc -l < "$file" 2>/dev/null || echo "?")
    echo "  ✅ $desc ($lines lines)"
  else
    echo "  ❌ $desc (missing)"
  fi
done
echo ""

# Check environment
echo "🌍 Environment Setup:"
if [ -f ".env.local" ]; then
  echo "  ✅ .env.local configured"
else
  if [ -f ".env.example" ]; then
    echo "  ⚠️  .env.local missing (copy from .env.example)"
  else
    echo "  ❌ .env.example missing"
  fi
fi
echo ""

# Check documentation
echo "📚 Documentation:"
docs=("README.md" "DEVELOPMENT.md" "PROJECT_COMPLETE.md" ".env.example")
for doc in "${docs[@]}"; do
  if [ -f "$doc" ]; then
    echo "  ✅ $doc"
  else
    echo "  ❌ $doc (missing)"
  fi
done
echo ""

echo "✨ Verification complete!"
echo ""
echo "Next steps:"
echo "  1. Copy .env.example to .env.local"
echo "  2. Configure environment variables"
echo "  3. Run: pnpm install"
echo "  4. Run: pnpm dev"
