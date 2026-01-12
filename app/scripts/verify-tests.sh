#!/usr/bin/env bash
# Quick test verification script
# Run from: bun run verify-tests (or directly: bash scripts/verify-tests.sh)

set -e

echo "🧪 Tada Test Suite Verification"
echo "================================"
echo ""

echo "📦 Installing dependencies..."
bun install --frozen-lockfile
echo "✅ Dependencies installed"
echo ""

echo "🔍 Running linter..."
bun run lint
echo "✅ Linting passed"
echo ""

echo "🔧 Running typecheck..."
bun run typecheck
echo "✅ Type check passed"
echo ""

echo "🧪 Running tests..."
bun run test
echo "✅ Tests passed"
echo ""

echo "📊 Generating coverage report..."
bun run test:coverage
echo "✅ Coverage report generated"
echo ""

echo "✨ All checks passed! Test suite is ready."
echo ""
echo "📁 View coverage report:"
echo "   open coverage/index.html"
echo ""
echo "🚀 CI is configured and will run these checks automatically."
