# MCP MGit Server

A MCP server for executing `mgit push` operations with multiple instance support.

## Features

- ✅ Execute `mgit push` command for repositories
- ✅ Configurable mgit command (default: `mgit`)
- ✅ Multiple instance support with repository name isolation
- ✅ Operation logging
- ✅ Error handling and recovery

## Installation

### Global Installation (Recommended)
```bash
npm install -g @liangshanli/mcp-server-mgit
```

### Local Installation
```bash
npm install @liangshanli/mcp-server-mgit
```

### From Source
```bash
git clone https://github.com/liliangshan/mcp-server-mgit.git
cd mcp-server-mgit
npm install
```

## Configuration

Set environment variables:

```bash
# Required: Repository name (use 'mgit list' to view available repository names)
export REPO_NAME="my-repo"

# Optional: MGit command (default: mgit)
export MGIT_CMD="mgit"

# Optional: Project branding
export PROJECT_NAME="MyProject"
```

## Usage

### 1. Direct Run (Global Installation)
```bash
mcp-server-mgit
```

### 2. Using npx (Recommended)
```bash
npx @liangshanli/mcp-server-mgit
```

### 3. Direct Start (Source Installation)
```bash
npm start
```

### 4. Managed Start (Recommended for Production)
```bash
npm run start-managed
```

Managed start provides:
- Auto-restart (up to 10 times)
- Error recovery
- Process management
- Logging

### 5. Development Mode
```bash
npm run dev
```

## Editor Integration

### Cursor Editor Configuration

1. Create `.cursor/mcp.json` file in your project root:

```json
{
  "mcpServers": {
    "mgit": {
      "command": "npx",
      "args": ["@liangshanli/mcp-server-mgit"],
      "env": {
        "REPO_NAME": "my-repo",
        "MGIT_CMD": "mgit",
        "PROJECT_NAME": "MyProject"
      }
    }
  }
}
```

### VS Code Configuration

1. Install the MCP extension for VS Code
2. Create `.vscode/settings.json` file:

```json
{
  "mcp.servers": {
    "mgit": {
      "command": "npx",
      "args": ["@liangshanli/mcp-server-mgit"],
      "env": {
        "REPO_NAME": "my-repo",
        "MGIT_CMD": "mgit",
        "PROJECT_NAME": "MyProject"
      }
    }
  }
}
```

### Multiple MGit Server Instances Support

You can configure multiple MGit server instances with different `REPO_NAME` and `PROJECT_NAME` to isolate tools and configurations. Each instance must have a unique `REPO_NAME` (required). This is useful when you need to push to different repositories or manage different project groups. Use `mgit list` (or `${MGIT_CMD} list`) to view available repository names.

**Example: Cursor Editor Configuration**

Create `.cursor/mcp.json` file:

```json
{
  "mcpServers": {
    "mgit-local": {
      "disabled": false,
      "timeout": 60,
      "command": "npx",
      "args": ["@liangshanli/mcp-server-mgit"],
      "env": {
        "REPO_NAME": "local-repo",
        "MGIT_CMD": "mgit",
        "PROJECT_NAME": "local-mgit"
      }
    },
    "mgit-custom": {
      "disabled": false,
      "timeout": 60,
      "command": "npx",
      "args": ["@liangshanli/mcp-server-mgit"],
      "env": {
        "REPO_NAME": "custom-repo",
        "MGIT_CMD": "/path/to/custom-mgit",
        "PROJECT_NAME": "custom-mgit"
      }
    }
  }
}
```

**Benefits of Multiple Instances:**

- **Tool Isolation**: Each instance has its own tool names (e.g., `local_mgit_push`, `custom_mgit_push`)
- **Config Isolation**: Logs are stored in separate directories (e.g., `./.setting.local/`, `./.setting.custom/`)
- **Different Commands**: Configure different mgit commands for each instance
- **Project Branding**: Each instance can have its own project name for better identification

**Note**: When using multiple instances, tools will be prefixed with `REPO_NAME`. For example:
- `local-repo_mgit_push` - uses local mgit command for local-repo
- `custom-repo_mgit_push` - uses custom mgit command for custom-repo

### As MCP Server

The server communicates with MCP clients via stdin/stdout after startup:

```json
{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2025-06-18"}}
```

### Available Tools

1. **mgit_push**: Execute mgit push command for the repository configured via REPO_NAME environment variable
   ```json
   {
     "jsonrpc": "2.0",
     "id": 2,
     "method": "tools/call",
     "params": {
       "name": "mgit_push",
       "arguments": {
         "message": "Update project files"
       }
     }
   }
   ```

2. **get_operation_logs**: Get operation logs
   ```json
   {
     "jsonrpc": "2.0",
     "id": 3,
     "method": "tools/call",
     "params": {
       "name": "get_operation_logs",
       "arguments": {
         "limit": 50,
         "offset": 0
       }
     }
   }
   ```

## Logging

### General Logs
Log file location: `./.setting/mcp-mgit.log` (or `./.setting.<REPO_NAME>/mcp-mgit.log` if REPO_NAME is set)

Logged content:
- All requests and responses
- MGit operation records
- Error messages
- Server status changes

## Error Handling

- Individual request errors don't affect the entire server
- Process exceptions are automatically restarted (managed mode)
- Detailed error messages in logs

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| REPO_NAME | | **Required** repository name for push operations. Use `mgit list` (or `${MGIT_CMD} list`) to view available repository names. Example: `export REPO_NAME="my-repo"` |
| MGIT_CMD | mgit | Optional mgit command to execute (can be full path) |
| PROJECT_NAME | | Optional project branding for tool descriptions |
| MCP_LOG_DIR | ./.setting (or ./.setting.<REPO_NAME> if REPO_NAME is set) | Log directory |
| MCP_LOG_FILE | mcp-mgit.log | Log filename |

## Development

### Project Structure
```
mcp-server-mgit/
├── src/
│   └── server-final.js    # Main server file
├── bin/
│   └── cli.js              # CLI entry point
├── start-server.js         # Managed startup script
├── package.json
└── README.md
```

### Testing
```bash
npm test
```

## Quick Start

### 1. Install Package
```bash
npm install -g @liangshanli/mcp-server-mgit
```

### 2. Configure Environment Variables
```bash
# Required: Repository name
export REPO_NAME="my-repo"

# Optional: MGit command (default: mgit)
export MGIT_CMD="mgit"

# Optional: Project branding
export PROJECT_NAME="MyProject"
```

### 3. Run Server
```bash
mcp-server-mgit
```

## Usage Example

### Using the mgit_push tool

The `mgit_push` tool executes the command: `${MGIT_CMD} push ${REPO_NAME} "<message>"`

**Note:** The repository name is configured via the `REPO_NAME` environment variable (required). Use `mgit list` (or `${MGIT_CMD} list`) to view available repository names.

**Parameters:**
- `message` (required): The commit message for the push operation

**Example:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "mgit_push",
    "arguments": {
      "message": "Update documentation"
    }
  }
}
```

If `REPO_NAME="my-project"` and `MGIT_CMD="mgit"`, this will execute: `mgit push my-project "Update documentation"`

## License

MIT
