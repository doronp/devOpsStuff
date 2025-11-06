#!/bin/bash

# Quick startup script - assumes services are already set up

export KMP_DUPLICATE_LIB_OK=TRUE

cd "$(dirname "$0")/.."

mkdir -p logs

echo "Starting backend..."
cd apps/clip-backend
source venv/bin/activate && uvicorn src.main:app --reload &
cd ../..

sleep 3

echo "Starting frontend dev server..."
cd apps/desktop-ui
npm run dev &
cd ../..

sleep 3

echo "Starting Electron..."
cd apps/desktop-ui
VITE_DEV_SERVER_URL=http://localhost:3000 npm run electron:dev
