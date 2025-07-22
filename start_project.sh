#!/bin/bash

echo "========================================"
echo "Cyrus Blog Project Startup Script"
echo "========================================"

echo
echo "[1/5] Checking environment..."

# Check Rust
if ! command -v rustc &> /dev/null; then
    echo "ERROR: Rust not found. Please install Rust first."
    echo "Visit: https://rustup.rs/"
    exit 1
fi
echo "✓ Rust found"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js not found. Please install Node.js first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi
echo "✓ Node.js found"

echo
echo "[2/5] Setting up backend..."

# Create data directory
if [ ! -d "backend/data" ]; then
    mkdir -p "backend/data"
    echo "✓ Created data directory"
fi

# Check .env file
if [ ! -f "backend/.env" ]; then
    echo "ERROR: backend/.env file not found!"
    echo "Please create backend/.env with required configuration."
    exit 1
fi
echo "✓ Backend .env file found"

echo
echo "[3/5] Setting up frontend..."

# Check frontend .env
if [ ! -f "frontend-new/.env" ]; then
    echo "ERROR: frontend-new/.env file not found!"
    echo "Please create frontend-new/.env with required configuration."
    exit 1
fi
echo "✓ Frontend .env file found"

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend-new
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install frontend dependencies"
    exit 1
fi
cd ..
echo "✓ Frontend dependencies installed"

echo
echo "[4/5] Checking backend compilation..."
cd backend
cargo check
if [ $? -ne 0 ]; then
    echo "ERROR: Backend compilation failed"
    echo "Please check the error messages above"
    exit 1
fi
cd ..
echo "✓ Backend compilation successful"

echo
echo "[5/5] Starting services..."
echo
echo "Starting backend server..."
echo "You can access the API at: http://localhost:3001/api"
echo
echo "After backend starts, open a new terminal and run:"
echo "  cd frontend-new"
echo "  npm run dev"
echo
echo "Then access the frontend at: http://localhost:3000"
echo
echo "Press Ctrl+C to stop the backend server"
echo

cd backend
cargo run
