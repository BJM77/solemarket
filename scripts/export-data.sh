#!/usr/bin/env bash
set -e

# Ensure dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Run the export script
npx ts-node scripts/export-firestore-data.ts

echo "Export complete. Check data/products.json for output."
