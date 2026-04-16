# yapi2code MCP Server

这是一个 Model Context Protocol (MCP) 服务器，用于从 YApi 导出的 `remoteUrl` 获取接口数据，并基于 `yapi2code` 的 `generateCode` 规则生成接口请求代码与类型定义片段；同时支持将生成结果按规则写入本地文件。

## ✨ 功能特性

- **配置文件读取**：自动向上查找并读取项目中的 `yapi.config.json`
- **YApi 数据获取（remoteUrl）**：通过 `remoteUrl` 拉取分类数组数据，默认缓存 30 分钟
- **超时可配置**：支持配置/传参调整拉取 `export-full` 的超时（适合大项目 20MB+ 导出）
- **代码生成（yapi2code 风格）**：生成 `fullCode`（包含 `import`、请求函数、请求/响应类型）
- **生成结果落盘**：生成后可写入指定目录；未指定则写入 `src/yapi`
- **文件命名规则**：按 `fnName.ts`（首字母不大写）

## ✨ 快速开始

### 1) 安装依赖并构建

```bash
cd /Users/zcy/yjn/note/yapi-gen-server
npm install
npm run build
```
调试：

```bash
# 建议把 Inspector 的请求超时调大，避免长接口/大导出触发 MCP error -32001
MCP_SERVER_REQUEST_TIMEOUT=300000 npx @modelcontextprotocol/inspector node --watch --import tsx src/server.ts
```

### 2) 在 Cursor 中加载 MCP

在 Cursor 的 MCP 配置（`mcpServers`）中添加：

```json
{
  "mcpServers": {
    "yapi2code": {
      "command": "node",
      "args": ["/Users/zcy/yjn/note/yapi-gen-server/dist/server.js"]
    }
  }
}
```

保存后，Cursor 会启动该 MCP Server，并在可用工具列表里出现下述工具。

### 3) 项目中配置 yapi.config.json

在你的目标项目根目录创建 `yapi.config.json`（至少包含 `remoteUrl`）：

```json
{
  "remoteUrl": "https://your-yapi-domain.com/api/open/plugin/export-full?type=json&pid=xxxx&status=all&token=your-token",
  "timeoutMs": 120000
}
```

> 建议使用 `export-full`，以便导出数据里包含 `req_query / req_body_other / res_body` 等字段，从而生成更完整的类型。

## ✨ 可用工具

### 1️⃣ read_config - 读取配置文件

从 `projectPath`（或当前工作目录）开始向上查找并读取 `yapi.config.json`。

**参数**
- `projectPath`（可选）：用于定位配置文件的项目路径

### 2️⃣ get_yapi_data - 获取 YApi 数据

从 `remoteUrl` 拉取分类数组数据，默认缓存 30 分钟。

**参数**
- `remoteUrl`：YApi 导出接口 URL（返回分类数组）
- `listAll`（可选）：是否输出扁平接口列表（含 `path/method/title` 等）
- `interfacePath`（可选）：指定接口路径
- `method`（可选）：请求方法；不传则按 `interfacePath` 自动匹配（同路径多方法时按 `GET > POST > PUT > DELETE > PATCH` 选择）
- `forceRefresh`（可选）：跳过缓存强制刷新
- `timeoutMs`（可选）：HTTP 请求超时（毫秒），默认 `120000`

### 3️⃣ generate_yapi2code_from_remote - 生成并写入代码文件

按 `interfacePath`（可选再带 `method`）从导出数据中定位接口，生成 `fullCode` 并写入文件。

**参数**
- `interfacePath`：接口路径，如 `/api/user/list`
- `method`（可选）：请求方法；不传则按 `interfacePath` 自动匹配（同路径多方法时按 `GET > POST > PUT > DELETE > PATCH` 选择）
- `remoteUrl`（可选）：不传则自动从 `yapi.config.json` 读取
- `projectPath`（可选）：用于定位 `yapi.config.json`，同时作为相对输出目录的根
- `importStatement`（可选）：生成文件顶部的导入语句，默认 `import {request} from 'doraemon';`
- `outputDir`（可选）：生成文件输出目录（相对 `projectPath`/当前工作目录），默认 `src/yapi`
- `forceRefresh`（可选）：跳过缓存强制刷新
- `timeoutMs`（可选）：HTTP 请求超时（毫秒）；不传则使用 `yapi.config.json.timeoutMs`，再不传则默认 `120000`

**返回**
- `data.fnName`：生成的函数名（lowerCamelCase）
- `data.filePath`：写入的文件绝对路径
- `data.fullCode`：完整代码文本（也会写入文件）

## ✨ 生成文件规则

- **默认目录**：`src/yapi/`
- **文件名**：`<fnName>.ts`（首字母不大写）
- **返回类型**：
  - 默认返回 `I<FnName>ResBody`（完整响应体）
  - 若无法生成 `ResBody`，则回退返回 `I<FnName>ResData`（仅 `data` 字段类型）
  - 当 `ResBody` 已生成时，不再额外生成 `ResData/ResDataItem`，避免 `ResBody.data` 与 `ResData` 重复

示例：`fnName = bidopenGetSupplierBidFileDownloadUrl`  
输出文件：`src/yapi/bidopenGetSupplierBidFileDownloadUrl.ts`

## 📄 许可证

MIT License

