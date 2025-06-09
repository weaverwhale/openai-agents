# Service Runner Scripts

This directory contains utility scripts to run both your backend API (from `backend/` directory) and frontend Vite (from `frontend/` directory) development/production servers simultaneously.

## Available Scripts

### Node.js Script (`run-services.js`)

A cross-platform Node.js script with advanced process management.

**Usage:**

```bash
# Development mode (default)
node scripts/run-services.js dev
npm run services:dev
npm run fullstack:dev

# Production mode
node scripts/run-services.js prod
npm run services:prod
npm run fullstack:prod

# Build only
node scripts/run-services.js build
npm run services:build

# Help
node scripts/run-services.js help
```

### Bash Script (`run-services.sh`)

A Unix/Linux/macOS bash script alternative.

**Usage:**

```bash
# Development mode (default)
./scripts/run-services.sh dev

# Production mode
./scripts/run-services.sh prod

# Build only
./scripts/run-services.sh build

# Help
./scripts/run-services.sh help
```

## Features

### Development Mode

- ✅ Auto-installs dependencies if missing (root, backend, frontend)
- 🚀 Starts backend API server with hot reload (`npm run api:dev` in backend/)
- ⚡ Starts frontend Vite dev server with HMR
- 🔗 Backend API: http://localhost:3001
- 🔗 Frontend: http://localhost:5173
- 🛑 Graceful shutdown with Ctrl+C

### Production Mode

- ✅ Auto-installs dependencies if missing
- 🔨 Builds frontend for production
- 🏭 Starts backend API server in production mode
- 📦 Starts frontend preview server
- 🔗 Backend API: http://localhost:3001
- 🔗 Frontend Preview: http://localhost:4173
- 🛑 Graceful shutdown with Ctrl+C

### Build Mode

- ✅ Auto-installs dependencies if missing
- 🎨 Builds frontend (`npm run build`)
- 🔧 Builds backend if build script exists
- ✨ No server startup, just builds

## Process Management

Both scripts provide:

- **Graceful shutdown**: Properly terminates all child processes
- **Cross-platform**: Works on Windows, macOS, and Linux
- **Error handling**: Catches and reports process errors
- **Dependency checking**: Automatically installs missing node_modules
- **Colored output**: Easy-to-read console output with labels

## Quick Start

The fastest way to get started in development:

```bash
# Using npm scripts (recommended)
npm run fullstack:dev

# Or directly
node scripts/run-services.js
```

For production:

```bash
# Using npm scripts
npm run fullstack:prod

# Or directly
node scripts/run-services.js prod
```

## Environment Variables

The scripts respect the same environment variables as your individual services:

- `PORT` - Backend API port (default: 3001)
- Any other variables used by your API server or Vite configuration

## Troubleshooting

### Port Already in Use

If you get port conflicts:

- Backend API (3001): Check if another instance is running
- Frontend Dev (5173): Vite will auto-increment to 5174, 5175, etc.
- Frontend Preview (4173): Similar auto-increment behavior

### Permission Denied

If you get permission errors on Unix systems:

```bash
chmod +x scripts/run-services.sh
chmod +x scripts/run-services.js
```

### Dependencies Not Found

The scripts automatically check and install dependencies, but if issues persist:

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install
```
