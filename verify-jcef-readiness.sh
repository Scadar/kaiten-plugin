#!/bin/bash
# JCEF Browser Readiness Verification Script
# Subtask 7-2: Test in embedded JCEF browser
# This script runs all automated pre-checks before manual JCEF testing

set -e  # Exit on any error

echo "======================================"
echo "JCEF Browser Readiness Verification"
echo "======================================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track overall status
FAILED=0

echo "Running automated pre-checks..."
echo ""

# Check 1: React UI Build
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "CHECK 1: React UI Build"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd ui
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASSED${NC} - React UI built successfully"
    # Check bundle size
    if [ -f "dist/index.html" ]; then
        SIZE=$(wc -c < dist/index.html)
        echo "  Bundle size: ${SIZE} bytes"
    fi
else
    echo -e "${RED}✗ FAILED${NC} - React UI build failed"
    FAILED=1
fi
cd ..
echo ""

# Check 2: TypeScript Type Checking
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "CHECK 2: TypeScript Type Checking"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd ui
if npm run type-check > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASSED${NC} - No TypeScript errors"
else
    echo -e "${RED}✗ FAILED${NC} - TypeScript type errors found"
    FAILED=1
fi
cd ..
echo ""

# Check 3: Unit Tests
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "CHECK 3: Unit Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd ui
if npm test -- --run > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASSED${NC} - All unit tests passing"
    # Get test count
    TEST_OUTPUT=$(npm test -- --run 2>&1 | grep "Test Files" || echo "")
    if [ -n "$TEST_OUTPUT" ]; then
        echo "  $TEST_OUTPUT"
    fi
else
    echo -e "${RED}✗ FAILED${NC} - Some unit tests failing"
    FAILED=1
fi
cd ..
echo ""

# Check 4: Kotlin Compilation
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "CHECK 4: Kotlin Compilation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if ./gradlew compileKotlin > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASSED${NC} - Kotlin compilation successful"
else
    echo -e "${RED}✗ FAILED${NC} - Kotlin compilation failed"
    FAILED=1
fi
echo ""

# Check 5: Code Migration Verification
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "CHECK 5: Code Migration Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check for deprecated RPC calls
DEPRECATED_RPCS=("getState" "getTasks" "getTask" "getCurrentUser" "getSpaces" "getBoards")
MIGRATION_OK=true

for RPC in "${DEPRECATED_RPCS[@]}"; do
    if grep -r "bridge.call('$RPC'" ui/src --include="*.ts" --include="*.tsx" > /dev/null 2>&1; then
        echo -e "${RED}✗ FOUND${NC} - Deprecated RPC call: bridge.call('$RPC')"
        MIGRATION_OK=false
        FAILED=1
    fi
done

if $MIGRATION_OK; then
    echo -e "${GREEN}✓ PASSED${NC} - No deprecated RPC calls found"
fi

# Check for valid RPC calls
VALID_RPCS=("getSettings" "updateSettings" "getProjectPath" "getSelectedFile")
VALID_RPC_COUNT=0

for RPC in "${VALID_RPCS[@]}"; do
    if grep -r "bridge.call('$RPC'" ui/src --include="*.ts" --include="*.tsx" > /dev/null 2>&1; then
        VALID_RPC_COUNT=$((VALID_RPC_COUNT + 1))
    fi
done

echo "  Valid IDE-specific RPC calls found: $VALID_RPC_COUNT"

# Check for React Query hooks
HOOKS=("useSpaces" "useBoards" "useColumns" "useTasks" "useCurrentUser" "useSettings")
HOOKS_FOUND=0

for HOOK in "${HOOKS[@]}"; do
    if grep -r "export.*function $HOOK" ui/src --include="*.ts" > /dev/null 2>&1; then
        HOOKS_FOUND=$((HOOKS_FOUND + 1))
    fi
done

if [ $HOOKS_FOUND -eq ${#HOOKS[@]} ]; then
    echo -e "${GREEN}✓ PASSED${NC} - All React Query hooks implemented ($HOOKS_FOUND/${#HOOKS[@]})"
else
    echo -e "${YELLOW}⚠ WARNING${NC} - Some hooks missing ($HOOKS_FOUND/${#HOOKS[@]})"
fi
echo ""

# Check 6: File Structure Verification
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "CHECK 6: File Structure Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

REQUIRED_FILES=(
    "ui/src/api/types.ts"
    "ui/src/api/errors.ts"
    "ui/src/api/client.ts"
    "ui/src/api/endpoints.ts"
    "ui/src/lib/cache.ts"
    "ui/src/hooks/useKaitenQuery.ts"
    "ui/src/hooks/useSettings.ts"
    "ui/src/lib/filters.ts"
)

FILES_OK=true
for FILE in "${REQUIRED_FILES[@]}"; do
    if [ -f "$FILE" ]; then
        echo -e "${GREEN}✓${NC} $FILE"
    else
        echo -e "${RED}✗${NC} $FILE (missing)"
        FILES_OK=false
        FAILED=1
    fi
done

if $FILES_OK; then
    echo -e "${GREEN}✓ PASSED${NC} - All required files present"
fi
echo ""

# Summary
echo "======================================"
echo "VERIFICATION SUMMARY"
echo "======================================"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ ALL AUTOMATED CHECKS PASSED${NC}"
    echo ""
    echo "The application is ready for manual JCEF browser testing."
    echo ""
    echo "Next steps:"
    echo "1. Run: ./gradlew runIde"
    echo "2. Open Kaiten tool window in IDE"
    echo "3. Follow manual test checklist in jcef-test-report.md"
    echo ""
    exit 0
else
    echo -e "${RED}✗ SOME CHECKS FAILED${NC}"
    echo ""
    echo "Please fix the failed checks before proceeding with JCEF testing."
    echo ""
    exit 1
fi
