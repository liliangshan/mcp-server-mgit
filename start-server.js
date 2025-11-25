const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get repository name for log directory
const REPO_NAME = process.env.REPO_NAME || '';

// Validate REPO_NAME is required
if (!REPO_NAME || REPO_NAME.trim() === '') {
  console.error('ERROR: REPO_NAME environment variable is required but not set.');
  console.error('Please set REPO_NAME environment variable before starting the server.');
  console.error('Example: export REPO_NAME="my-repo"');
  console.error('You can use "mgit list" to view available repository names.');
  process.exit(1);
}

// 日志配置
const getLogConfig = () => {
  // Default log directory: .setting/ or .setting.<REPO_NAME>/
  let defaultLogDir = './.setting';
  if (REPO_NAME) {
    defaultLogDir = `./.setting.${REPO_NAME}`;
  }
  
  const logDir = process.env.MCP_LOG_DIR || defaultLogDir;
  const logFile = process.env.MCP_LOG_FILE || 'mcp-mgit-managed.log';
  return {
    dir: logDir,
    file: logFile,
    fullPath: path.join(logDir, logFile)
  };
};

// 确保日志目录存在
const ensureLogDir = () => {
  const { dir } = getLogConfig();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// 写入日志
const writeLog = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    data: data ? JSON.stringify(data) : null
  };
  
  const logLine = `${timestamp} | ${level} | ${message}${data ? ` | ${JSON.stringify(data)}` : ''}\n`;
  
  try {
    ensureLogDir();
    const { fullPath } = getLogConfig();
    fs.appendFileSync(fullPath, logLine, 'utf8');
  } catch (err) {
    console.error('Failed to write log file:', err.message);
  }
  
  // 同时输出到控制台
  console.error(`[${level}] ${message}`);
};

// Get server script path
const serverPath = path.resolve(__dirname, './src/server-final.js');

// Check if server file exists
if (!fs.existsSync(serverPath)) {
  const errorMsg = `Server file not found: ${serverPath}`;
  writeLog('ERROR', errorMsg);
  process.exit(1);
}

writeLog('INFO', `Starting MCP MGit server (managed mode) from: ${serverPath}`);

let server = null;
let restartCount = 0;
const maxRestarts = 10;

// Function to start server
function startServer() {
  // Create environment object
  const env = {
    ...process.env,
    // Ensure environment variables are passed
    MGIT_CMD: process.env.MGIT_CMD || 'mgit',
    REPO_NAME: process.env.REPO_NAME || '',
    PROJECT_NAME: process.env.PROJECT_NAME || '',
    MCP_LOG_DIR: process.env.MCP_LOG_DIR || (process.env.REPO_NAME ? `./.setting.${process.env.REPO_NAME}` : './.setting'),
    MCP_LOG_FILE: process.env.MCP_LOG_FILE || 'mcp-mgit.log',
  };

  writeLog('INFO', 'Starting MCP MGit server with environment:', {
    MGIT_CMD: env.MGIT_CMD,
    REPO_NAME: env.REPO_NAME,
    PROJECT_NAME: env.PROJECT_NAME || '(not set)',
    MCP_LOG_DIR: env.MCP_LOG_DIR,
    MCP_LOG_FILE: env.MCP_LOG_FILE
  });

  server = spawn('node', [serverPath], {
    stdio: ['inherit', 'inherit', 'inherit'],
    env: env
  });

  writeLog('INFO', `MCP MGit server process started with PID: ${server.pid} (restart count: ${restartCount})`);

  // Add signal handling debug info
  writeLog('INFO', 'Signal handlers registered for SIGINT and SIGTERM');
  writeLog('INFO', 'Press Ctrl+C to gracefully shutdown the server');
  
}

// Start the server
startServer();

// Handle process exit
server.on('close', (code) => {
  writeLog('INFO', `MCP MGit server exited with code: ${code}`);
  
  // If server exited with error and we haven't exceeded max restarts, restart it
  if (code !== 0 && restartCount < maxRestarts) {
    restartCount++;
    writeLog('INFO', `Server crashed, restarting... (${restartCount}/${maxRestarts})`);
    setTimeout(() => {
      startServer();
    }, 2000); // Wait 2 seconds before restart
  } else if (code !== 0) {
    writeLog('ERROR', `Server crashed ${maxRestarts} times, giving up`);
    process.exit(1);
  } else {
    // Server exited normally
    writeLog('INFO', 'Server exited normally');
    process.exit(0);
  }
});

// Handle server error
server.on('error', (err) => {
  writeLog('ERROR', 'Server process error:', {
    error: err.message,
    stack: err.stack
  });
  
  if (restartCount < maxRestarts) {
    restartCount++;
    writeLog('INFO', `Server error, restarting... (${restartCount}/${maxRestarts})`);
    setTimeout(() => {
      startServer();
    }, 2000);
  } else {
    writeLog('ERROR', `Server error ${maxRestarts} times, giving up`);
    process.exit(1);
  }
});

// Handle signals
process.on('SIGINT', () => {
  writeLog('INFO', 'Received SIGINT, shutting down server...');
  gracefulShutdown('SIGINT');
});

process.on('SIGTERM', () => {
  writeLog('INFO', 'Received SIGTERM, shutting down server...');
  gracefulShutdown('SIGTERM');
});

// Handle Windows specific signals
process.on('SIGBREAK', () => {
  writeLog('INFO', 'Received SIGBREAK, shutting down server...');
  gracefulShutdown('SIGTERM');
});

// Handle process exit
process.on('exit', (code) => {
  writeLog('INFO', `Managed server process exiting with code: ${code}`);
});

// Graceful shutdown function
function gracefulShutdown(signal) {
  // Set a timeout to force exit if server doesn't respond
  global.shutdownTimeout = setTimeout(() => {
    writeLog('WARN', 'Server shutdown timeout, forcing exit...');
    try {
      if (server) {
        server.kill('SIGKILL');
      }
    } catch (err) {
      writeLog('ERROR', 'Failed to force kill server:', {
        error: err.message
      });
    }
    process.exit(1);
  }, 10000); // 10 seconds timeout
  
  // Try graceful shutdown
  try {
    if (server) {
      server.kill(signal);
      writeLog('INFO', `Sent ${signal} signal to server process ${server.pid}`);
    } else {
      writeLog('WARN', 'No server process to shutdown');
      process.exit(0);
    }
  } catch (err) {
    writeLog('ERROR', `Failed to send ${signal} signal to server:`, {
      error: err.message
    });
    if (global.shutdownTimeout) {
      clearTimeout(global.shutdownTimeout);
    }
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  writeLog('ERROR', 'Uncaught exception in managed server:', {
    error: err.message,
    stack: err.stack
  });
  if (server) {
    server.kill('SIGTERM');
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  writeLog('ERROR', 'Unhandled Promise rejection in managed server:', {
    reason: reason.toString(),
    promise: promise.toString()
  });
  if (server) {
    server.kill('SIGTERM');
  }
  process.exit(1);
});

