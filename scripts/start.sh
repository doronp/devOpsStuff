#!/bin/bash

# Startup script for OpenCLIP Desktop Application

set -e

echo "=========================================="
echo "Starting OpenCLIP Desktop Application"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -d "apps/clip-backend" ] || [ ! -d "apps/desktop-ui" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo "Shutting down services..."
    pkill -P $$ 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend
echo "Starting backend API..."
cd apps/clip-backend
if [ ! -d "venv" ]; then
    echo "❌ Backend venv not found. Please run setup.sh first."
    exit 1
fi

# Export OpenMP fix for macOS
export KMP_DUPLICATE_LIB_OK=TRUE

# Start backend in background
source venv/bin/activate
uvicorn src.main:app --reload > ../../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ../..

echo "✓ Backend starting (PID: $BACKEND_PID)"
echo "  Logs: logs/backend.log"
echo "  API: http://localhost:8000"
echo ""

# Wait for backend to be ready
echo "Waiting for backend to start..."
for i in {1..30}; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo "✓ Backend is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Backend failed to start. Check logs/backend.log"
        cleanup
    fi
    sleep 1
done

echo ""

# Start frontend Vite dev server
echo "Starting Vite dev server..."
cd apps/desktop-ui
if [ ! -d "node_modules" ]; then
    echo "❌ node_modules not found. Please run setup.sh first."
    cleanup
fi

npm run dev > ../../logs/vite.log 2>&1 &
VITE_PID=$!
cd ../..

echo "✓ Vite dev server starting (PID: $VITE_PID)"
echo "  Logs: logs/vite.log"
echo "  URL: http://localhost:3000"
echo ""

# Wait for Vite to be ready
echo "Waiting for Vite to start..."
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "✓ Vite is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Vite failed to start. Check logs/vite.log"
        cleanup
    fi
    sleep 1
done

echo ""

# Start Electron app
echo "Starting Electron app..."
cd apps/desktop-ui
VITE_DEV_SERVER_URL=http://localhost:3000 npm run electron:dev > ../../logs/electron.log 2>&1 &
ELECTRON_PID=$!
cd ../..

echo "✓ Electron app starting (PID: $ELECTRON_PID)"
echo "  Logs: logs/electron.log"
echo ""

echo "=========================================="
echo "All services started successfully!"
echo "=========================================="
echo ""
echo "Services running:"
echo "  - Backend API: http://localhost:8000"
echo "  - Vite dev server: http://localhost:3000"
echo "  - Electron app: Window should open"
echo ""
echo "Logs directory: logs/"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for all background processes
wait
