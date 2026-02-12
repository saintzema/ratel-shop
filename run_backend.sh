#!/bin/bash

# Ensure we are in the project root
cd "$(dirname "$0")"

# Backend Directory
BACKEND_DIR="backend"

echo "Starting Ratel Backend..."

# Check if backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
    echo "❌ Error: Directory '$BACKEND_DIR' not found!"
    exit 1
fi

cd "$BACKEND_DIR"

# Check if venv exists, if not create it
if [ ! -d "venv" ]; then
    echo "🐍 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate venv
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing modules..."
pip install -r requirements.txt

echo "✅ Starting FastAPI Server..."
# Run on port 8000
uvicorn app.main:app --reload --port 8000
