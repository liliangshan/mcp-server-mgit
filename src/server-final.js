const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);

// In-memory log storage
const operationLogs = [];
const MAX_LOGS = 1000;

// Push history storage
const pushHistory = [];
const MAX_PUSH_HISTORY = 100;

// Get repository name and project name
const REPO_NAME = process.env.REPO_NAME || '';
const PROJECT_NAME = process.env.PROJECT_NAME || '';
const MGIT_CMD = process.env.MGIT_CMD || 'mgit';
const LANGUAGE = process.env.LANGUAGE || 'en'; // Default to English

// Validate REPO_NAME is required
if (!REPO_NAME || REPO_NAME.trim() === '') {
  console.error('ERROR: REPO_NAME environment variable is required but not set.');
  console.error('Please set REPO_NAME environment variable before starting the server.');
  console.error('Example: export REPO_NAME="my-repo"');
  console.error('You can use "mgit list" (or "${MGIT_CMD} list") to view available repository names.');
  process.exit(1);
}

// Get log directory and filename
const getLogConfig = () => {
  // Default log directory: .setting/ or .setting.<REPO_NAME>/
  let defaultLogDir = './.setting';
  if (REPO_NAME) {
    defaultLogDir = `./.setting.${REPO_NAME}`;
  }
  
  const logDir = process.env.MCP_LOG_DIR || defaultLogDir;
  const logFile = process.env.MCP_LOG_FILE || 'mcp-mgit.log';
  const pushHistoryFile = process.env.MCP_PUSH_HISTORY_FILE || 'push-history.json';
  return {
    dir: logDir,
    file: logFile,
    fullPath: path.join(logDir, logFile),
    pushHistoryFile: pushHistoryFile,
    pushHistoryFullPath: path.join(logDir, pushHistoryFile)
  };
};

// Ensure log directory exists
const ensureLogDir = () => {
  const { dir } = getLogConfig();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Log recording function - record all requests and responses
const logRequest = (method, params, result, error = null) => {
  const logEntry = {
    id: Date.now(),
    method,
    params: JSON.stringify(params),
    result: result ? JSON.stringify(result) : null,
    error: error ? error.toString() : null,
    created_at: new Date().toISOString()
  };

  operationLogs.unshift(logEntry);
  if (operationLogs.length > MAX_LOGS) {
    operationLogs.splice(MAX_LOGS);
  }

  // Record request and response data
  const logLine = `${logEntry.created_at} | ${method} | ${logEntry.params} | ${error || 'SUCCESS'} | RESPONSE: ${logEntry.result || 'null'}\n`;

  try {
    ensureLogDir();
    const { fullPath } = getLogConfig();
    fs.appendFileSync(fullPath, logLine, 'utf8');
  } catch (err) {
    console.error('Failed to write log file:', err.message);
  }
};

// Load push history from file
const loadPushHistory = () => {
  try {
    const { pushHistoryFullPath } = getLogConfig();
    if (fs.existsSync(pushHistoryFullPath)) {
      const data = fs.readFileSync(pushHistoryFullPath, 'utf8');
      const history = JSON.parse(data);
      pushHistory.length = 0;
      pushHistory.push(...history);
    }
  } catch (err) {
    console.error('Failed to load push history:', err.message);
  }
};

// Save push history to file
const savePushHistory = () => {
  try {
    ensureLogDir();
    const { pushHistoryFullPath } = getLogConfig();
    fs.writeFileSync(pushHistoryFullPath, JSON.stringify(pushHistory, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save push history:', err.message);
  }
};

// Record push history
const recordPushHistory = (message, result, error = null) => {
  const pushEntry = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    repo_name: REPO_NAME,
    message: message,
    success: !error,
    error: error ? error.toString() : null,
    exit_code: result ? result.exitCode : null
  };

  pushHistory.unshift(pushEntry);
  if (pushHistory.length > MAX_PUSH_HISTORY) {
    pushHistory.splice(MAX_PUSH_HISTORY);
  }

  savePushHistory();
};

// Load push history on startup
loadPushHistory();

// Execute mgit push command
const executeMgitPush = async (message) => {
  return new Promise((resolve, reject) => {
    const command = MGIT_CMD;
    // Clean the message: remove or escape problematic characters
    // Remove double quotes from the message to avoid argument parsing issues
    // Replace double quotes with single quotes or remove them
    const cleanedMessage = message.replace(/"/g, "'");
    
    // When using spawn with array args, we don't need quotes
    // The message will be passed as a single argument even if it contains spaces
    const args = ['push', REPO_NAME, cleanedMessage];
    
    console.error(`Executing: ${command} ${args.map(arg => arg.includes(' ') ? `"${arg}"` : arg).join(' ')}`);
    
    // Use shell: false to pass arguments directly without shell interpretation
    // This ensures the message is passed as a single argument even with spaces
    const child = spawn(command, args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: false
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      console.error(output);
    });

    child.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      console.error(output);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({
          success: true,
          stdout: stdout,
          stderr: stderr,
          exitCode: code
        });
      } else {
        reject({
          success: false,
          stdout: stdout,
          stderr: stderr,
          exitCode: code,
          error: `Command exited with code ${code}`
        });
      }
    });

    child.on('error', (err) => {
      reject({
        success: false,
        error: err.message,
        stdout: stdout,
        stderr: stderr
      });
    });
  });
};

// 启动日志
console.error('=== MCP MGit Server Starting ===');
console.error(`Time: ${new Date().toISOString()}`);
console.error(`MGit Command: ${MGIT_CMD}`);
console.error(`Repository Name: ${REPO_NAME}`);
console.error(`Language: ${LANGUAGE}`);
if (PROJECT_NAME) {
  console.error(`Project Name: ${PROJECT_NAME}`);
}
console.error(`Started via: ${process.argv[1]}`);

// 显示日志配置
const logConfig = getLogConfig();
console.error(`Log Directory: ${logConfig.dir}`);
console.error(`Log File: ${logConfig.fullPath}`);
console.error('================================');

// Final MCP Server
class FinalMCPServer {
  constructor() {
    this.name = 'mgit-mcp-server';
    this.version = '1.0.0';
    this.initialized = false;
    this.hasCheckedPushHistory = false; // Track if push history has been checked
  }

  // Execute mgit push
  async mgit_push(params) {
    const { message } = params;

    if (!message || typeof message !== 'string') {
      throw new Error('Missing message parameter');
    }

    // Check if push history has been checked
    if (!this.hasCheckedPushHistory) {
      // Get the actual tool name (with prefix if REPO_NAME is set)
      const pushHistoryToolName = REPO_NAME ? `${REPO_NAME}_get_push_history` : 'get_push_history';
      const pushToolName = REPO_NAME ? `${REPO_NAME}_mgit_push` : 'mgit_push';
      
      // Return JSON-RPC 2.0 compliant result with multiple prompt messages
      return {
        content: [
          {
            type: 'text',
            text: '⚠️ ERROR: Push history check is required before pushing code.'
          },
          {
            type: 'text',
            text: `🔧 REQUIRED ACTION: You must call the "${pushHistoryToolName}" tool first to view recent push records.`
          },
          {
            type: 'text',
            text: `📋 TOOL NAME: "${pushHistoryToolName}" - Use this tool to get the last 5 push history records.`
          },
          {
            type: 'text',
            text: `📝 TOOL CALL EXAMPLE: Call tools/call with name="${pushHistoryToolName}" and empty arguments: {"name": "${pushHistoryToolName}", "arguments": {}}`
          },
          {
            type: 'text',
            text: '🔍 STEP 1: Call get_push_history tool to view the last 5 push records for this repository.'
          },
          {
            type: 'text',
            text: '📊 STEP 2: Review the push history records to see what has been pushed recently.'
          },
          {
            type: 'text',
            text: '✅ STEP 3: Confirm that the changes you want to push have NOT been pushed before by comparing with the history.'
          },
          {
            type: 'text',
            text: '🔄 STEP 4: If the changes have already been pushed, modify the commit message to reflect new changes, then try again.'
          },
          {
            type: 'text',
            text: `🚀 STEP 5: After reviewing and confirming, you can then call "${pushToolName}" tool to proceed with the push.`
          },
          {
            type: 'text',
            text: `⚠️ IMPORTANT: The "${pushHistoryToolName}" tool must be called before "${pushToolName}" tool, otherwise the push will be rejected.`
          }
        ],
        isError: true,
        errorCode: 'PUSH_HISTORY_CHECK_REQUIRED'
      };
    }

    try {
      const result = await executeMgitPush(message);
      
      // Log operation
      logRequest('mgit_push', { repo_name: REPO_NAME, message }, result);

      // Record push history
      recordPushHistory(message, result, null);

      // Reset the flag after successful push
      this.hasCheckedPushHistory = false;

      return {
        success: true,
        repo_name: REPO_NAME,
        message: message,
        output: result.stdout,
        error_output: result.stderr,
        exit_code: result.exitCode
      };
    } catch (err) {
      // Log operation error
      logRequest('mgit_push', { repo_name: REPO_NAME, message }, null, err.error || err.message);
      
      // Record push history even on error
      recordPushHistory(message, null, err.error || err.message);

      // Reset the flag after error
      this.hasCheckedPushHistory = false;
      
      throw new Error(`MGit push failed: ${err.error || err.message}`);
    }
  }

  // Get push history (last 5 records)
  async get_push_history(params) {
    // Mark that push history has been checked
    this.hasCheckedPushHistory = true;

    // Return last 5 push records
    const last5Records = pushHistory.slice(0, 5);

    return {
      total: pushHistory.length,
      records: last5Records,
      message: last5Records.length > 0 
        ? `Found ${last5Records.length} recent push record(s). Please review them to ensure your current changes have not been pushed before. After reviewing, you can proceed with mgit_push.`
        : 'No push history found. This appears to be the first push. You can now proceed with mgit_push.'
    };
  }

  // Get operation logs
  async get_operation_logs(params) {
    const { limit = 50, offset = 0 } = params || {};

    // Validate parameters
    if (typeof limit !== 'number' || limit < 1 || limit > 1000) {
      throw new Error('limit parameter must be between 1-1000');
    }

    if (typeof offset !== 'number' || offset < 0) {
      throw new Error('offset parameter must be greater than or equal to 0');
    }

    // Return logs from memory
    const logs = operationLogs.slice(offset, offset + limit);

    return {
      logs: logs,
      total: operationLogs.length,
      limit: limit,
      offset: offset,
      hasMore: offset + limit < operationLogs.length
    };
  }

  // Handle JSON-RPC requests
  async handleRequest(request) {
    try {
      const { jsonrpc, id, method, params } = request;

      if (jsonrpc !== '2.0') {
        logRequest('Unsupported JSON-RPC version', { jsonrpc }, null, 'Unsupported JSON-RPC version');
        throw new Error('Unsupported JSON-RPC version');
      }

      
      let result = null;
      let error = null;

      try {
        if (method === 'initialize') {
          // If already initialized, return success but don't re-initialize
          if (!this.initialized) {
            this.initialized = true;
            
            // Record actual client information
            const clientInfo = params?.clientInfo || {};
            logRequest('initialize', { 
              protocolVersion: params?.protocolVersion || '2025-06-18', 
              capabilities: params?.capabilities || {}, 
              clientInfo: clientInfo 
            }, null, null);
          }
          
          // Build server capabilities to match client capabilities
          const serverCapabilities = {
            tools: {
              listChanged: false
            }
          };
          
          // If client supports prompts, we also support it
          if (params?.capabilities?.prompts) {
            serverCapabilities.prompts = {
              listChanged: false
            };
          }
          
          // If client supports resources, we also support it
          if (params?.capabilities?.resources) {
            serverCapabilities.resources = {
              listChanged: false
            };
          }
          
          // If client supports logging, we also support it
          if (params?.capabilities?.logging) {
            serverCapabilities.logging = {
              listChanged: false
            };
          }
          
          // If client supports roots, we also support it
          if (params?.capabilities?.roots) {
            serverCapabilities.roots = {
              listChanged: false
            };
          }
          
          result = {
            protocolVersion: params?.protocolVersion || '2025-06-18',
            capabilities: serverCapabilities,
            serverInfo: {
              name: this.name,
              version: this.version
            }
          };
        } else if (method === 'tools/list') {
          // Build tool name with repository name prefix
          const getToolName = (baseName) => {
            return REPO_NAME ? `${REPO_NAME}_${baseName}` : baseName;
          };
          
          // Build tool description with project name
          const getToolDescription = (baseDescription) => {
            if (PROJECT_NAME) {
              return `[${PROJECT_NAME}] ${baseDescription}`;
            }
            return baseDescription;
          };
          
          result = {
            tools: [
              {
                name: getToolName('mgit_push'),
                description: getToolDescription(`Execute ${MGIT_CMD} push command for repository "${REPO_NAME}" with a commit message. 

IMPORTANT: 
- You MUST call get_push_history tool FIRST to view the last 5 push records before using this tool
- Confirm that the changes in this push have not been pushed before, otherwise modify the push message and push again
- The repository name is configured via REPO_NAME environment variable
- Language setting: ${LANGUAGE} (default: en)

USAGE: 
1. First call get_push_history to view recent push records
2. Then call this tool with the commit message parameter. Example:
{message: "${LANGUAGE === 'en' ? 'Update project files' : LANGUAGE === 'zh' || LANGUAGE === 'zh-CN' ? '更新项目文件' : LANGUAGE === 'zh-TW' ? '更新專案檔案' : 'Update project files'}"}

Please provide the commit message in ${LANGUAGE === 'en' ? 'English' : LANGUAGE === 'zh' || LANGUAGE === 'zh-CN' ? 'Chinese' : LANGUAGE === 'zh-TW' ? 'Traditional Chinese' : LANGUAGE} language.

NOTE: If the push result contains a branch merge URL (such as a pull request URL), please output it to the user. If you can open a browser, you may also automatically open the URL.`),
                inputSchema: {
                  type: 'object',
                  properties: {
                    message: {
                      type: 'string',
                      description: `Commit message in ${LANGUAGE === 'en' ? 'English' : LANGUAGE === 'zh' || LANGUAGE === 'zh-CN' ? 'Chinese' : LANGUAGE === 'zh-TW' ? 'Traditional Chinese' : LANGUAGE} language. Example: {message: "${LANGUAGE === 'en' ? 'Update project files' : LANGUAGE === 'zh' || LANGUAGE === 'zh-CN' ? '更新项目文件' : LANGUAGE === 'zh-TW' ? '更新專案檔案' : 'Update project files'}"}`
                    }
                  },
                  required: ['message']
                }
              },
              {
                name: getToolName('get_push_history'),
                description: getToolDescription(`Get the last 5 push history records for repository "${REPO_NAME}". This tool MUST be called before using mgit_push to ensure the current changes have not been pushed before. After calling this tool, you can proceed with mgit_push.`),
                inputSchema: {
                  type: 'object',
                  properties: {}
                }
              },
              {
                name: getToolName('get_operation_logs'),
                description: getToolDescription('Get operation logs'),
                inputSchema: {
                  type: 'object',
                  properties: {
                    limit: {
                      type: 'number',
                      description: 'Limit count, default 50'
                    },
                    offset: {
                      type: 'number',
                      description: 'Offset, default 0'
                    }
                  }
                }
              }
            ],
            environment: {
              MGIT_CMD: MGIT_CMD,
              REPO_NAME: REPO_NAME || '',
              PROJECT_NAME: PROJECT_NAME || '',
              LANGUAGE: LANGUAGE,
              serverInfo: {
                name: this.name,
                version: this.version
              }
            }
          };
        } else if (method === 'prompts/list') {
          // Return empty prompts list since we don't provide prompts functionality
          result = {
            prompts: []
          };
        } else if (method === 'prompts/call') {
          // Handle prompts call, but we don't provide prompts functionality
          result = {
            messages: [
              {
                role: 'assistant',
                content: [
                  {
                    type: 'text',
                    text: 'Unsupported prompts call'
                  }
                ]
              }
            ]
          };
        } else if (method === 'resources/list') {
          // Return empty resources list since we don't provide resources functionality
          result = {
            resources: []
          };
        } else if (method === 'resources/read') {
          // Handle resources read, but we don't provide resources functionality
          result = {
            contents: [
              {
                uri: 'error://unsupported',
                text: 'Unsupported resources read'
              }
            ]
          };
        } else if (method === 'logging/list') {
          // Return empty logging list since we don't provide logging functionality
          result = {
            logs: []
          };
        } else if (method === 'logging/read') {
          // Handle logging read, but we don't provide logging functionality
          result = {
            contents: [
              {
                uri: 'error://unsupported',
                text: 'Unsupported logging read'
              }
            ]
          };
        } else if (method === 'roots/list') {
          // Return empty roots list since we don't provide roots functionality
          result = {
            roots: []
          };
        } else if (method === 'roots/read') {
          // Handle roots read, but we don't provide resources functionality
          result = {
            contents: [
              {
                uri: 'error://unsupported',
                text: 'Unsupported roots read'
              }
            ]
          };
        } else if (method === 'tools/call') {
          const { name, arguments: args } = params || {};

          if (!name) {
            throw new Error('Missing tool name');
          }

          // Remove repository name prefix if present to get the actual method name
          let actualMethodName = name;
          if (REPO_NAME && name.startsWith(`${REPO_NAME}_`)) {
            actualMethodName = name.substring(REPO_NAME.length + 1);
          }

          // Check if method exists
          if (!this[actualMethodName]) {
            throw new Error(`Unknown tool: ${name}`);
          }

          const toolResult = await this[actualMethodName](args || {});

          // Check if result is already in content format (for special cases like push history check)
          if (toolResult && toolResult.content && Array.isArray(toolResult.content)) {
            result = toolResult;
          } else {
            // Tool call results need to be wrapped in content
            result = {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(toolResult, null, 2)
                }
              ]
            };
          }
        } else if (method === 'ping') {
          logRequest('ping', {}, { status: 'pong' }, null);
          result = { pong: true };
        } else if (method === 'shutdown') {
          // Handle shutdown request
          result = null;
          // Delay exit to give client time to process response
          setTimeout(() => {
            process.exit(0);
          }, 100);
        } else if (method === 'notifications/initialized') {
          // Handle initialization notification
          logRequest('notifications/initialized', {}, { status: 'initialized' }, null);
        } else if (method === 'notifications/exit') {
          // Handle exit notification
          result = null;
          process.exit(0);
        } else {
          throw new Error(`Unknown method: ${method}`);
        }
      } catch (err) {
        error = err.message;
        throw err;
      } finally {
        // Record all requests to log, ensure parameters are not undefined
        const safeParams = params || {};
        logRequest(method, safeParams, result, error);
      }

      // For notification methods, no response is needed
      if (method === 'notifications/initialized' || method === 'notifications/exit') {
        return null;
      }
      
      // shutdown method needs to return response
      if (method === 'shutdown') {
        return {
          jsonrpc: '2.0',
          id,
          result: null
        };
      }

      // Ensure all methods return correct response format
      return {
        jsonrpc: '2.0',
        id,
        result
      };
    } catch (error) {
      // Use standard MCP error codes
      let errorCode = -32603; // Internal error
      let errorMessage = error.message;
      
      if (error.message.includes('Server not initialized')) {
        errorCode = -32002; // Server not initialized
      } else if (error.message.includes('Unknown method')) {
        errorCode = -32601; // Method not found
      } else if (error.message.includes('Unsupported JSON-RPC version')) {
        errorCode = -32600; // Invalid Request
      }
      logRequest('error', { error: error.message, stack: error.stack }, null, error.message);
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: errorCode,
          message: errorMessage
        }
      };
    }
  }

  // Start server
  async start() {
    console.error('MCP MGit server started');

    // Display log configuration
    const logConfig = getLogConfig();
    console.error(`Log directory: ${logConfig.dir}`);
    console.error(`Log file: ${logConfig.fullPath}`);

    // Listen to stdin
    process.stdin.setEncoding('utf8');

    process.stdin.on('data', async (data) => {
      try {
        const lines = data.toString().trim().split('\n');

        for (const line of lines) {
          if (line.trim()) {
            try {
              const request = JSON.parse(line);
              const response = await this.handleRequest(request);
              if (response) {
                console.log(JSON.stringify(response));
              }
            } catch (requestError) {
              console.error('Error processing individual request:', requestError.message);
              // Send error response instead of crashing the entire server
              const errorResponse = {
                jsonrpc: '2.0',
                id: null,
                error: {
                  code: -32603,
                  message: `Internal error: ${requestError.message}`
                }
              };
              console.log(JSON.stringify(errorResponse));
            }
          }
        }
      } catch (error) {
        console.error('Error processing data:', error.message);
        // Log error but don't exit server
        logRequest('data_processing_error', { error: error.message }, null, error.message);
      }
    });

    // Handle process signals
    process.on('SIGTERM', async () => {
      console.error('Received SIGTERM signal, shutting down server...');
      logRequest('SIGTERM', { signal: 'SIGTERM' }, { status: 'shutting_down' }, null);
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.error('Received SIGINT signal, shutting down server...');
      logRequest('SIGINT', { signal: 'SIGINT' }, { status: 'shutting_down' }, null);
      process.exit(0);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error);
      logRequest('uncaughtException', { error: error.message, stack: error.stack }, null, error.message);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Promise rejection:', reason);
      logRequest('unhandledRejection', { reason: reason.toString(), promise: promise.toString() }, null, reason.toString());
      process.exit(1);
    });

    // Record server startup
    logRequest('server_start', {
      name: this.name,
      version: this.version,
      logDir: logConfig.dir,
      logFile: logConfig.fullPath
    }, { status: 'started' }, null);
  }
}

// Start server
async function main() {
  console.error('Starting MCP MGit server...');
  const server = new FinalMCPServer();
  await server.start();
  console.error('MCP MGit server started successfully');
}

main().catch(error => {
  console.error(error);
  // Write to log
  logRequest('main', { error: error.message, stack: error.stack }, null, error.message);
  process.exit(1);
});

