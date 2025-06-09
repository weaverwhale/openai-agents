#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class ServiceRunner {
  constructor() {
    this.processes = [];
    this.isWindows = process.platform === 'win32';
  }

  // Graceful shutdown handler
  setupGracefulShutdown() {
    const shutdown = (signal) => {
      console.log(`\n🔄 Received ${signal}. Shutting down services...`);
      this.processes.forEach((proc, index) => {
        if (proc && !proc.killed) {
          console.log(`📱 Terminating process ${index + 1}...`);
          if (this.isWindows) {
            spawn('taskkill', ['/pid', proc.pid, '/f', '/t']);
          } else {
            proc.kill('SIGTERM');
          }
        }
      });

      setTimeout(() => {
        console.log('✅ Services stopped');
        process.exit(0);
      }, 2000);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }

  // Spawn a process with proper output handling
  spawnProcess(command, args, options, label) {
    const proc = spawn(command, args, {
      stdio: 'pipe',
      shell: this.isWindows,
      ...options,
    });

    // Handle stdout
    proc.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`[${label}] ${output}`);
      }
    });

    // Handle stderr
    proc.stderr.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.error(`[${label}] ${output}`);
      }
    });

    // Handle process exit
    proc.on('close', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`[${label}] Process exited with code ${code}`);
      }
    });

    proc.on('error', (error) => {
      console.error(`[${label}] Error: ${error.message}`);
    });

    this.processes.push(proc);
    return proc;
  }

  // Check if dependencies are installed
  async checkDependencies() {
    const rootPackageExists = fs.existsSync(path.join(process.cwd(), 'node_modules'));
    const backendPackageExists = fs.existsSync(
      path.join(process.cwd(), 'backend', 'node_modules'),
    );
    const frontendPackageExists = fs.existsSync(
      path.join(process.cwd(), 'frontend', 'node_modules'),
    );

    if (!rootPackageExists) {
      console.log('📦 Installing root dependencies...');
      await this.runCommand('npm', ['install'], { cwd: process.cwd() }, 'ROOT-INSTALL');
    }

    if (!backendPackageExists) {
      console.log('📦 Installing backend dependencies...');
      await this.runCommand(
        'npm',
        ['install'],
        { cwd: path.join(process.cwd(), 'backend') },
        'BACKEND-INSTALL',
      );
    }

    if (!frontendPackageExists) {
      console.log('📦 Installing frontend dependencies...');
      await this.runCommand(
        'npm',
        ['install'],
        { cwd: path.join(process.cwd(), 'frontend') },
        'FRONTEND-INSTALL',
      );
    }
  }

  // Promise wrapper for spawn process
  runCommand(command, args, options, label) {
    return new Promise((resolve, reject) => {
      const proc = this.spawnProcess(command, args, options, label);
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Process exited with code ${code}`));
      });
    });
  }

  // Development mode
  async runDevelopment() {
    console.log('🚀 Starting development servers...\n');

    await this.checkDependencies();

    // Start backend API server
    console.log('🔧 Starting backend API server...');
    this.spawnProcess(
      'npm',
      ['run', 'api:dev'],
      {
        cwd: path.join(process.cwd(), 'backend'),
      },
      '🚀 API',
    );

    // Wait a bit for API to start
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Start frontend Vite server
    console.log('🎨 Starting frontend Vite server...');
    this.spawnProcess(
      'npm',
      ['run', 'dev'],
      {
        cwd: path.join(process.cwd(), 'frontend'),
      },
      '⚡ VITE',
    );

    console.log('\n✅ Development servers started!');
    console.log('🔗 Backend API: http://localhost:3001');
    console.log('🔗 Frontend: http://localhost:5173');
    console.log('\n💡 Press Ctrl+C to stop all services\n');
  }

  // Production mode
  async runProduction() {
    console.log('🏭 Starting production servers...\n');

    await this.checkDependencies();

    // Build frontend first
    console.log('🔨 Building frontend for production...');
    await this.runCommand(
      'npm',
      ['run', 'build'],
      {
        cwd: path.join(process.cwd(), 'frontend'),
      },
      'BUILD',
    );

    // Start backend API server in production mode
    console.log('🚀 Starting backend API server...');
    this.spawnProcess(
      'npm',
      ['start'],
      {
        cwd: path.join(process.cwd(), 'backend'),
      },
      '🏭 API',
    );

    // Start frontend preview server
    console.log('🎨 Starting frontend preview server...');
    this.spawnProcess(
      'npm',
      ['run', 'preview'],
      {
        cwd: path.join(process.cwd(), 'frontend'),
      },
      '📦 PREVIEW',
    );

    console.log('\n✅ Production servers started!');
    console.log('🔗 Backend API: http://localhost:3001');
    console.log('🔗 Frontend Preview: http://localhost:4173');
    console.log('\n💡 Press Ctrl+C to stop all services\n');
  }

  // Build only mode
  async buildOnly() {
    console.log('🔨 Building application...\n');

    await this.checkDependencies();

    // Build frontend
    console.log('🎨 Building frontend...');
    await this.runCommand(
      'npm',
      ['run', 'build'],
      {
        cwd: path.join(process.cwd(), 'frontend'),
      },
      'FRONTEND-BUILD',
    );

    // Build backend if build script exists
    const backendPackageFile = path.join(process.cwd(), 'backend', 'package.json');
    if (fs.existsSync(backendPackageFile)) {
      const backendPackage = JSON.parse(fs.readFileSync(backendPackageFile));
      if (backendPackage.scripts && backendPackage.scripts.build) {
        console.log('🔧 Building backend...');
        await this.runCommand(
          'npm',
          ['run', 'build'],
          {
            cwd: path.join(process.cwd(), 'backend'),
          },
          'BACKEND-BUILD',
        );
      }
    }

    console.log('\n✅ Build completed!');
  }
}

// CLI interface
function showHelp() {
  console.log(`
🚀 OpenAI Agents Service Runner

Usage: node scripts/run-services.js [command]

Commands:
  dev, development    Start development servers (API + Vite dev server)
  prod, production    Start production servers (API + Vite preview)
  build              Build both frontend and backend
  help               Show this help message

Examples:
  node scripts/run-services.js dev
  node scripts/run-services.js production
  node scripts/run-services.js build

Development URLs:
  🔗 Backend API: http://localhost:3001
  🔗 Frontend: http://localhost:5173

Production URLs:
  🔗 Backend API: http://localhost:3001  
  🔗 Frontend Preview: http://localhost:4173
`);
}

async function main() {
  const runner = new ServiceRunner();
  runner.setupGracefulShutdown();

  const command = process.argv[2] || 'dev';

  switch (command.toLowerCase()) {
    case 'dev':
    case 'development':
      await runner.runDevelopment();
      break;

    case 'prod':
    case 'production':
      await runner.runProduction();
      break;

    case 'build':
      await runner.buildOnly();
      break;

    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ServiceRunner;
