#!/bin/bash

# Start script for Rust backend with Socket.IO bridge

set -e

echo "🚀 Starting Open WebUI Rust Backend with Socket.IO Bridge..."

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed"
    exit 1
fi

# Install Python dependencies if needed
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

echo "📦 Installing Socket.IO dependencies..."
pip install -q -r socketio_requirements.txt

# Start Socket.IO bridge in background
echo "🔌 Starting Socket.IO bridge on port 8081..."
python3 socketio_bridge.py &
SOCKETIO_PID=$!

# Give Socket.IO bridge time to start
sleep 2

# Start Rust backend
echo "⚙️  Starting Rust backend on port 8080..."
cargo run &
RUST_PID=$!

# Trap to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down..."
    kill $SOCKETIO_PID 2>/dev/null || true
    kill $RUST_PID 2>/dev/null || true
    exit 0
}

trap cleanup INT TERM

echo ""
echo "✅ Services started!"
echo "   - Rust Backend: http://localhost:8080"
echo "   - Socket.IO Bridge: http://localhost:8081"
echo "   - Socket.IO endpoint: ws://localhost:8081/socket.io/"
echo ""
echo "💡 Update your frontend to connect to ws://localhost:8081/socket.io/"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for both processes
wait $SOCKETIO_PID $RUST_PID

