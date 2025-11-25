# MCP MGit 服务器

一个支持多实例的 MCP 服务器，用于执行 `mgit push` 操作。

## 前置要求

**⚠️ 重要提示：** 此 MCP 服务器需要在您的系统上安装并配置 [MGit](https://github.com/liliangshan/mgit) 工具。

MGit 是一个用于管理多个 Git 项目的命令行工具。它可以帮助您高效地管理、同步和更新多个 Git 仓库。

### MGit 安装和设置

在使用此 MCP 服务器之前，请：

1. **安装 MGit**：从 [https://github.com/liliangshan/mgit/releases](https://github.com/liliangshan/mgit/releases) 下载并安装 MGit
2. **初始化 MGit**：按照 [MGit README](https://github.com/liliangshan/mgit/blob/main/README.md) 中的 MGit 设置说明进行操作
3. **配置项目**：使用 `mgit init` 将您的 Git 仓库添加到 MGit
4. **验证设置**：使用 `mgit list` 查看可用的仓库名称

有关详细的 MGit 使用说明、功能和配置，请参考 [MGit README](https://github.com/liliangshan/mgit/blob/main/README.md)。

### MGit 主要功能

- 多项目管理：一键管理多个 Git 项目
- 多语言支持：支持中文（简体/繁体）、英语、日语、韩语、法语等多种语言
- 远程数据库同步：支持跨多个设备的项目配置同步
- 智能分支管理：自动检测和切换分支以避免冲突
- 批量操作：支持同时拉取/推送多个项目的更改

## 功能特性

- ✅ 为仓库执行 `mgit push` 命令
- ✅ 可配置的 mgit 命令（默认：`mgit`）
- ✅ 支持多实例，使用仓库名称隔离
- ✅ 操作日志记录
- ✅ 错误处理和恢复

## 安装

### 全局安装（推荐）
```bash
npm install -g @liangshanli/mcp-server-mgit
```

### 本地安装
```bash
npm install @liangshanli/mcp-server-mgit
```

### 从源码安装
```bash
git clone https://github.com/liliangshan/mcp-server-mgit.git
cd mcp-server-mgit
npm install
```

## 配置

设置环境变量：

```bash
# 必需：仓库名称（使用 'mgit list' 查看可用的仓库名称）
export REPO_NAME="my-repo"

# 可选：MGit 命令（默认：mgit）
export MGIT_CMD="mgit"

# 可选：语言设置（默认：en）
# 支持的值：en（英语）、zh（中文）、zh-CN（简体中文）、zh-TW（繁体中文）
export LANGUAGE="zh-CN"

# 可选：启用/禁用推送历史检查（默认：true）
# 设置为 false 可跳过历史检查要求
export CHECK_PUSH_HISTORY="true"

# 可选：项目标识
export PROJECT_NAME="MyProject"
```

## 使用方法

### 1. 直接运行（全局安装）
```bash
mcp-server-mgit
```

### 2. 使用 npx（推荐）
```bash
npx @liangshanli/mcp-server-mgit
```

### 3. 直接启动（源码安装）
```bash
npm start
```

### 4. 托管启动（生产环境推荐）
```bash
npm run start-managed
```

托管启动提供：
- 自动重启（最多 10 次）
- 错误恢复
- 进程管理
- 日志记录

### 5. 开发模式
```bash
npm run dev
```

## 编辑器集成

### Cursor 编辑器配置

1. 在项目根目录创建 `.cursor/mcp.json` 文件：

```json
{
  "mcpServers": {
    "mgit": {
      "command": "npx",
      "args": ["@liangshanli/mcp-server-mgit"],
      "env": {
        "REPO_NAME": "my-repo",
        "MGIT_CMD": "mgit",
        "LANGUAGE": "zh-CN",
        "PROJECT_NAME": "MyProject"
      }
    }
  }
}
```

### VS Code 配置

1. 为 VS Code 安装 MCP 扩展
2. 创建 `.vscode/settings.json` 文件：

```json
{
  "mcp.servers": {
    "mgit": {
      "command": "npx",
      "args": ["@liangshanli/mcp-server-mgit"],
      "env": {
        "REPO_NAME": "my-repo",
        "MGIT_CMD": "mgit",
        "LANGUAGE": "zh-CN",
        "PROJECT_NAME": "MyProject"
      }
    }
  }
}
```

### 多实例 MGit 服务器支持

您可以配置多个具有不同 `REPO_NAME` 和 `PROJECT_NAME` 的 MGit 服务器实例，以隔离工具和配置。每个实例必须具有唯一的 `REPO_NAME`（必需）。这在您需要推送到不同仓库或管理不同项目组时非常有用。使用 `mgit list`（或 `${MGIT_CMD} list`）查看可用的仓库名称。

**示例：Cursor 编辑器配置**

创建 `.cursor/mcp.json` 文件：

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
        "LANGUAGE": "zh-CN",
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
        "LANGUAGE": "zh-CN",
        "PROJECT_NAME": "custom-mgit"
      }
    }
  }
}
```

**多实例的优势：**

- **工具隔离**：每个实例都有自己的工具名称（例如：`local-repo_mgit_push`、`custom-repo_mgit_push`）
- **配置隔离**：日志存储在单独的目录中（例如：`./.setting.local-repo/`、`./.setting.custom-repo/`）
- **不同命令**：为每个实例配置不同的 mgit 命令
- **项目标识**：每个实例可以有自己的项目名称以便更好地识别

**注意**：使用多实例时，工具名称会以 `REPO_NAME` 作为前缀。例如：
- `local-repo_mgit_push` - 为 local-repo 使用本地 mgit 命令
- `custom-repo_mgit_push` - 为 custom-repo 使用自定义 mgit 命令

### 作为 MCP 服务器

服务器启动后通过 stdin/stdout 与 MCP 客户端通信：

```json
{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2025-06-18"}}
```

### 可用工具

1. **mgit_push**：为通过 REPO_NAME 环境变量配置的仓库执行 mgit push 命令
   ```json
   {
     "jsonrpc": "2.0",
     "id": 2,
     "method": "tools/call",
     "params": {
       "name": "mgit_push",
       "arguments": {
         "message": "更新项目文件"
       }
     }
   }
   ```

2. **get_operation_logs**：获取操作日志
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

## 日志记录

### 常规日志
日志文件位置：`./.setting/mcp-mgit.log`（如果设置了 REPO_NAME，则为 `./.setting.<REPO_NAME>/mcp-mgit.log`）

记录内容：
- 所有请求和响应
- MGit 操作记录
- 错误消息
- 服务器状态更改

## 错误处理

- 单个请求错误不会影响整个服务器
- 进程异常会自动重启（托管模式）
- 日志中提供详细的错误消息

## 环境变量

| 变量 | 默认值 | 说明 |
|----------|---------|-------------|
| REPO_NAME | | **必需** 用于推送操作的仓库名称。使用 `mgit list`（或 `${MGIT_CMD} list`）查看可用的仓库名称。示例：`export REPO_NAME="my-repo"` |
| MGIT_CMD | mgit | 可选的要执行的 mgit 命令（可以是完整路径） |
| LANGUAGE | en | 可选的提交消息语言设置。支持的值：`en`（英语）、`zh` 或 `zh-CN`（简体中文）、`zh-TW`（繁体中文）。工具会提示用户以配置的语言提供提交消息。 |
| CHECK_PUSH_HISTORY | true | 可选的标志，用于启用/禁用推送前检查推送历史。设置为 `false` 可跳过历史检查要求。当为 `true`（默认）时，在使用 `mgit_push` 之前必须调用 `get_push_history` 工具。当为 `false` 时，可以直接推送而无需检查历史。 **注意：** 如果遇到错误 `Encountered error in step execution: error executing cascade step: CORTEX_STEP_TYPE_MCP_TOOL: calling "tools/call": EOF`，请设置 `CHECK_PUSH_HISTORY="false"` 以禁用推送历史检查。 |
| PROJECT_NAME | | 可选的工具描述项目标识 |
| MCP_LOG_DIR | ./.setting（如果设置了 REPO_NAME，则为 ./.setting.<REPO_NAME>） | 日志目录 |
| MCP_LOG_FILE | mcp-mgit.log | 日志文件名 |

## 开发

### 项目结构
```
mcp-server-mgit/
├── src/
│   └── server-final.js    # 主服务器文件
├── bin/
│   └── cli.js              # CLI 入口点
├── start-server.js         # 托管启动脚本
├── package.json
└── README.md
```

### 测试
```bash
npm test
```

## 快速开始

### 1. 安装包
```bash
npm install -g @liangshanli/mcp-server-mgit
```

### 2. 配置环境变量
```bash
# 必需：仓库名称
export REPO_NAME="my-repo"

# 可选：MGit 命令（默认：mgit）
export MGIT_CMD="mgit"

# 可选：语言设置（默认：en）
export LANGUAGE="zh-CN"

# 可选：启用/禁用推送历史检查（默认：true）
# 设置为 false 可跳过历史检查要求
export CHECK_PUSH_HISTORY="true"

# 可选：项目标识
export PROJECT_NAME="MyProject"
```

### 3. 运行服务器
```bash
mcp-server-mgit
```

## 使用示例

### 使用 mgit_push 工具

`mgit_push` 工具执行命令：`${MGIT_CMD} push ${REPO_NAME} "<message>"`

**注意：** 仓库名称通过 `REPO_NAME` 环境变量配置（必需）。使用 `mgit list`（或 `${MGIT_CMD} list`）查看可用的仓库名称。

**参数：**
- `message`（必需）：推送操作的提交消息

**示例：**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "mgit_push",
    "arguments": {
      "message": "更新文档"
    }
  }
}
```

如果 `REPO_NAME="my-project"` 且 `MGIT_CMD="mgit"`，这将执行：`mgit push my-project "更新文档"`

## 故障排除

### 错误：`Encountered error in step execution: error executing cascade step: CORTEX_STEP_TYPE_MCP_TOOL: calling "tools/call": EOF`

如果在尝试推送代码时遇到此错误，可能是由推送历史检查功能引起的。要解决此问题，请通过设置环境变量来禁用推送历史检查：

```bash
export CHECK_PUSH_HISTORY="false"
```

设置此变量后，重启 MCP 服务器并再次尝试推送。这将允许您直接推送，而无需先检查推送历史。

## 许可证

MIT

