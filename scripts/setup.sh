#!/bin/bash

# Quick setup script for OpenCLIP Desktop Image Search

set -e  # Exit on error

echo "=========================================="
echo "OpenCLIP Desktop Setup"
echo "=========================================="
echo ""

# Check prerequisites
echo "Checking prerequisites..."

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.9 or later."
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
echo "✓ Python $PYTHON_VERSION found"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18 or later."
    exit 1
fi

NODE_VERSION=$(node --version)
echo "✓ Node.js $NODE_VERSION found"

# Check pnpm (optional)
if command -v pnpm &> /dev/null; then
    PACKAGE_MANAGER="pnpm"
    echo "✓ pnpm found"
else
    PACKAGE_MANAGER="npm"
    echo "⚠ pnpm not found, using npm instead"
fi

echo ""
echo "=========================================="
echo "Setting up Backend"
echo "=========================================="
echo ""

cd apps/clip-backend

# Create virtual environment
echo "Creating Python virtual environment..."
python3 -m venv venv

# Activate virtual environment
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
elif [ -f "venv/Scripts/activate" ]; then
    source venv/Scripts/activate
else
    echo "❌ Failed to create virtual environment"
    exit 1
fi

# Install dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Copy .env.example if .env doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "✓ Created .env (you can customize this later)"
fi

# Create data directories
echo "Creating data directories..."
mkdir -p data/indices
mkdir -p data/models

echo "✓ Backend setup complete!"

cd ../..

echo ""
echo "=========================================="
echo "Setting up Frontend"
echo "=========================================="
echo ""

cd apps/desktop-ui

echo "Installing Node.js dependencies..."
$PACKAGE_MANAGER install

echo "✓ Frontend setup complete!"

cd ../..

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Start the backend:"
echo "   cd apps/clip-backend"
echo "   source venv/bin/activate  # On Windows: venv\\Scripts\\activate"
echo "   uvicorn src.main:app --reload"
echo ""
echo "2. In a new terminal, start the frontend:"
echo "   cd apps/desktop-ui"
echo "   $PACKAGE_MANAGER electron:dev"
echo ""
echo "3. Follow the in-app prompts to index your images and start searching!"
echo ""
echo "For more information, see README.md"
echo ""
