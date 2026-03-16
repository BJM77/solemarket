#!/bin/bash
set -e

echo "🧹 Cleaning previous build artifacts..."
rm -rf .next .firebase

echo "📦 Cleaning dependencies to ensure Cloud Build compatibility..."
# We remove node_modules but KEEP package-lock.json to ensure consistent versions!
rm -rf node_modules
# rm -rf package-lock.json # DISABLED: Never delete lockfile, it causes version drift.

echo "📥 Installing dependencies..."
# Using legacy-peer-deps to be safe with React 19 / Next 15 conflicts if any
if [ -f package-lock.json ]; then
    npm ci --legacy-peer-deps
else
    npm install --legacy-peer-deps
fi

echo "🚀 Deploying to Firebase..."
# We use --only to be specific, or just default deploy.
# We use npx to ensure we use the local or latest firebase tools
npx firebase deploy

echo "✅ Deploy Complete!"
