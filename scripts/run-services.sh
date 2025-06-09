#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_header() {
    echo -e "${BLUE}$1${NC}"
}

# Function to handle cleanup on exit
cleanup() {
    print_status "Shutting down services..."
    # Kill all background jobs
    jobs -l | awk '{print $2}' | xargs -r kill -TERM 2>/dev/null
    exit 0
}

# Set up trap for cleanup
trap cleanup SIGINT SIGTERM

# Function to check if dependencies are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if [ ! -d "node_modules" ]; then
        print_status "Installing root dependencies..."
        npm install
    fi
    
    if [ ! -d "backend/node_modules" ]; then
        print_status "Installing backend dependencies..."
        cd backend && npm install && cd ..
    fi
    
    if [ ! -d "frontend/node_modules" ]; then
        print_status "Installing frontend dependencies..."
        cd frontend && npm install && cd ..
    fi
}

# Function to run development servers
run_development() {
    print_header "🚀 Starting development servers..."
    echo
    
    check_dependencies
    
    # Start API server in background
    print_status "Starting backend API server..."
    cd backend && npm run api:dev &
    API_PID=$!
    cd ..
    
    # Wait for API to start
    sleep 3
    
    # Start frontend server in background
    print_status "Starting frontend Vite server..."
    cd frontend && npm run dev &
    FRONTEND_PID=$!
    cd ..
    
    echo
    print_header "✅ Development servers started!"
    echo "🔗 Backend API: http://localhost:3001"
    echo "🔗 Frontend: http://localhost:5173"
    echo
    print_status "Press Ctrl+C to stop all services"
    echo
    
    # Wait for background processes
    wait
}

# Function to run production servers
run_production() {
    print_header "🏭 Starting production servers..."
    echo
    
    check_dependencies
    
    # Build frontend first
    print_status "Building frontend for production..."
    cd frontend && npm run build && cd ..
    
    # Start API server in background
    print_status "Starting backend API server..."
    cd backend && npm start &
    API_PID=$!
    cd ..
    
    # Start frontend preview server in background
    print_status "Starting frontend preview server..."
    cd frontend && npm run preview &
    FRONTEND_PID=$!
    cd ..
    
    echo
    print_header "✅ Production servers started!"
    echo "🔗 Backend API: http://localhost:3001"
    echo "🔗 Frontend Preview: http://localhost:4173"
    echo
    print_status "Press Ctrl+C to stop all services"
    echo
    
    # Wait for background processes
    wait
}

# Function to build application
build_only() {
    print_header "🔨 Building application..."
    echo
    
    check_dependencies
    
    # Build frontend
    print_status "Building frontend..."
    cd frontend && npm run build && cd ..
    
    # Build backend if build script exists
    if [ -f "backend/package.json" ] && cd backend && npm run | grep -q "build"; then
        print_status "Building backend..."
        npm run build
        cd ..
    elif [ -f "backend/package.json" ]; then
        cd ..
    fi
    
    echo
    print_header "✅ Build completed!"
}

# Function to show help
show_help() {
    echo
    print_header "🚀 OpenAI Agents Service Runner"
    echo
    echo "Usage: ./scripts/run-services.sh [command]"
    echo
    echo "Commands:"
    echo "  dev, development    Start development servers (API + Vite dev server)"
    echo "  prod, production    Start production servers (API + Vite preview)"
    echo "  build              Build both frontend and backend"
    echo "  help               Show this help message"
    echo
    echo "Examples:"
    echo "  ./scripts/run-services.sh dev"
    echo "  ./scripts/run-services.sh production"
    echo "  ./scripts/run-services.sh build"
    echo
    echo "Development URLs:"
    echo "  🔗 Backend API: http://localhost:3001"
    echo "  🔗 Frontend: http://localhost:5173"
    echo
    echo "Production URLs:"
    echo "  🔗 Backend API: http://localhost:3001"
    echo "  🔗 Frontend Preview: http://localhost:4173"
    echo
}

# Main script logic
case "${1:-dev}" in
    "dev"|"development")
        run_development
        ;;
    "prod"|"production")
        run_production
        ;;
    "build")
        build_only
        ;;
    "help"|"--help"|"-h")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac 