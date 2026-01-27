#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Tada Dev Container - Setup Script
# ═══════════════════════════════════════════════════════════════
# This script runs on container creation and is idempotent.
# It detects the project stack and installs dependencies.
# ═══════════════════════════════════════════════════════════════

set -e  # Exit on error

echo "═══════════════════════════════════════════════════════════════"
echo "Tada Dev Container - Setup"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ───────────────────────────────────────────────────────────────
# DETECT PROJECT STRUCTURE
# ───────────────────────────────────────────────────────────────

echo "➤ Detecting project structure..."

if [ -d "/workspaces/tada/app" ]; then
    echo "  ✓ Monorepo detected: app/ directory found"
    APP_DIR="/workspaces/tada/app"
else
    echo "  ⚠ Monorepo structure not found, using root"
    APP_DIR="/workspaces/tada"
fi

# ───────────────────────────────────────────────────────────────
# DETECT PACKAGE MANAGER
# ───────────────────────────────────────────────────────────────

echo "➤ Detecting package manager..."

if [ -f "$APP_DIR/bun.lock" ] || [ -f "$APP_DIR/bun.lockb" ]; then
    echo "  ✓ Bun detected (bun.lock found)"
    PKG_MANAGER="bun"
elif [ -f "$APP_DIR/pnpm-lock.yaml" ]; then
    echo "  ✓ pnpm detected (pnpm-lock.yaml found)"
    PKG_MANAGER="pnpm"
elif [ -f "$APP_DIR/yarn.lock" ]; then
    echo "  ✓ Yarn detected (yarn.lock found)"
    PKG_MANAGER="yarn"
elif [ -f "$APP_DIR/package-lock.json" ]; then
    echo "  ✓ npm detected (package-lock.json found)"
    PKG_MANAGER="npm"
else
    echo "  ⚠ No lockfile found, defaulting to bun"
    PKG_MANAGER="bun"
fi

# ───────────────────────────────────────────────────────────────
# VERIFY RUNTIME
# ───────────────────────────────────────────────────────────────

echo "➤ Verifying runtime..."

if command -v bun &> /dev/null; then
    BUN_VERSION=$(bun --version)
    echo "  ✓ Bun installed: v$BUN_VERSION"
else
    echo "  ✗ Bun not found (should be in base image)"
    exit 1
fi

# ───────────────────────────────────────────────────────────────
# CREATE PERSISTENT DIRECTORIES
# ───────────────────────────────────────────────────────────────

echo "➤ Setting up persistent directories..."

# Command history directory (bind mount from host)
if [ ! -d "/commandhistory" ]; then
    echo "  ⚠ /commandhistory not mounted (expected bind mount)"
else
    touch /commandhistory/.zsh_history
    chmod 600 /commandhistory/.zsh_history
    echo "  ✓ Command history configured"
fi

# SQLite data directory (if in app/)
if [ -d "$APP_DIR" ] && [ ! -d "$APP_DIR/data" ]; then
    mkdir -p "$APP_DIR/data"
    echo "  ✓ Created $APP_DIR/data directory"
fi

# ───────────────────────────────────────────────────────────────
# VERIFY SHELL CONFIGURATION
# ───────────────────────────────────────────────────────────────

echo "➤ Verifying shell configuration..."

if command -v zsh &> /dev/null; then
    echo "  ✓ Zsh installed"
else
    echo "  ✗ Zsh not found"
    exit 1
fi

if command -v starship &> /dev/null; then
    echo "  ✓ Starship prompt installed"
else
    echo "  ✗ Starship not found"
    exit 1
fi

if command -v fzf &> /dev/null; then
    echo "  ✓ fzf installed (Ctrl-R for history search)"
else
    echo "  ⚠ fzf not found"
fi

if command -v rg &> /dev/null; then
    echo "  ✓ ripgrep installed"
else
    echo "  ⚠ ripgrep not found"
fi

if command -v bat &> /dev/null; then
    echo "  ✓ bat installed"
else
    echo "  ⚠ bat not found"
fi

if command -v eza &> /dev/null; then
    echo "  ✓ eza installed"
else
    echo "  ⚠ eza not found"
fi

# ───────────────────────────────────────────────────────────────
# SUMMARY
# ───────────────────────────────────────────────────────────────

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "Setup Complete!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Detected Configuration:"
echo "  • Project: Tada (Nuxt 3 + Bun)"
echo "  • App Directory: $APP_DIR"
echo "  • Package Manager: $PKG_MANAGER"
echo "  • Runtime: Bun v$BUN_VERSION"
echo "  • Shell: zsh (with autosuggestions, syntax highlighting)"
echo "  • Prompt: starship"
echo "  • Tools: fzf, ripgrep, bat, eza"
echo ""
echo "Next Steps:"
echo "  1. Dependencies will be installed by postCreateCommand"
echo "  2. Run 'cd app' to enter the Nuxt workspace"
echo "  3. Run 'bun run dev' to start the dev server"
echo ""
echo "Shell Features:"
echo "  • Ctrl-R: fzf history search"
echo "  • Tab: Auto-completion"
echo "  • Type a command: Auto-suggestions (grey text)"
echo "  • Persistent history across container rebuilds"
echo ""
echo "═══════════════════════════════════════════════════════════════"
