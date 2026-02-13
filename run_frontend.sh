#!/bin/bash

# Ensure we are in the project root
cd "$(dirname "$0")"

# Frontend Directory
FRONTEND_DIR="frontend"

echo "Starting Ratel Frontend..."

# Check if frontend directory exists
if [ ! -d "$FRONTEND_DIR" ]; then
    echo "❌ Error: Directory '$FRONTEND_DIR' not found!"
    exit 1
fi

cd "$FRONTEND_DIR"

# Add node to PATH (using the detected path)
export PATH=$PATH:/Users/zema/.nvm/versions/node/v20.20.0/bin

if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies (first run)..."
    npm install
fi

echo "✅ Starting Next.js Dev Server..."
npm run dev
