---
name: yapi2code-generate-list-page
description: 当用户提出“根据接口/YApi 接口生成列表页”时：先问列表页生成位置；再调用 yapi2code MCP 生成接口文件（推荐存 services 下）；随后基于生成的类型收集表格列/搜索项/操作列并经用户确认；最后按 DOC下的 LIST_PAGE_PATTERN.md 生成 React Hooks 列表页（禁止 class）。
---

# yapi2code 生成列表页（React Hooks）

当用户提出“根据接口 / 根据 YApi 接口生成列表页 / 生成列表页面 + 接口”时，严格按下述流程执行。目标是：

- **先确定列表页代码生成位置**
- **再用 `yapi2code` MCP 生成接口请求代码与类型**
- **再确认：表格列 / 搜索项 / 是否需要操作列**
- **最后按 `DOC/LIST_PAGE_PATTERN.md` 的范式生成列表页**

硬规则：

- **门禁（必须执行）**：
  - **每次使用本 skill 必须先询问用户并拿到明确答案**：①列表页生成位置 ②接口文件生成位置 ③列字段/搜索项/操作列
  - **在用户回答完上述 ①②③ 之前，禁止**：调用 MCP、写任何列表页代码、猜测默认目录、擅自选字段
  - 只有当你把用户选择的字段/操作列/搜索项 **结构化回显并得到“确认按此生成”** 后，才能开始落地列表页代码
- **生成的页面必须是 React 函数组件 + Hooks**（例如 `useRequest` / `useMemo` / `useCallback`）。**禁止 class 组件**
- 列表页实现以 `ZcyList` 的 **config + onSearch** 合约为准（见范式文档），不要自行拼一套不一致的分页/搜索逻辑
- MCP 调用前 **必须先查看工具 schema**（参数名/必填项以 schema 为准）

## 触发场景（看到就用）

- 用户说：**根据接口 xxx 生成列表页** / **根据 yapi 接口生成列表页** / **生成列表页** / **列表页面 + 接口**

## 需要从用户收集的最少信息

- **接口标识**（至少一个）：
  - `interfacePath`（优先，例如 `/api/user/list`）
  - 或 YApi 的接口名称/描述（若不是路径，先追问对应 `interfacePath`）
- **列表页生成位置**：要把页面代码生成到哪个目录/文件（相对仓库根目录即可）
- **接口文件生成位置**：`yapi2code` 生成的 services 文件放哪里
  - 推荐：`src/services/yapi/` 或 `src/services/`（让用户选一个具体目录）

## 执行流程（必须按顺序）

### 1) 先问：列表页生成位置（第一句就问）

提问模板（必须问到明确路径）：

```text
你希望把“列表页代码”生成到哪个位置？请给一个相对仓库根目录的路径（例如：src/pages/UserList/index.tsx 或 src/views/user-list/index.tsx）。
```

同时收集接口信息（若用户没给就追问）：

```text
对应的接口路径（interfacePath）是什么？例如 /api/user/list（如果有 method 也一起给：GET/POST）。
```

### 2) 再问：接口文件生成位置（推荐 services 下）

```text
你希望把这次生成的接口请求文件存放到哪个目录？建议放在 src/services/ 下（例如 src/services/yapi）。
```

> 记录两个路径：`listPageOutPath`（列表页输出）与 `apiOutDir`（接口文件输出目录）。

### 3) 调用 yapi2code MCP 生成接口文件

#### 3.1 先看 schema（强制）

先读取 MCP 工具 `generate_yapi2code_from_remote` 的 schema，确认参数名与必填项。

#### 3.2 再调用 MCP（生成并落盘）

调用 `generate_yapi2code_from_remote`（server：`user-yapi2code`）：

- 必传：`interfacePath`
- 可选：`method`（用户提供则带上）
- 可选：`projectPath`（通常用当前仓库根目录）
- 可选：`outputDir = apiOutDir`
- 如需自定义 request 导入：`importStatement`

生成后必须回显给用户：

- **生成的接口文件绝对路径**（`data.filePath`）
- **生成的函数名**（`data.fnName`）
- **生成内容摘要**：请求参数类型名/响应类型名（从 `fullCode` 中提取关键类型名即可）

### 4) 基于生成的类型，判断是否“列表接口”

从生成的 `fullCode`/响应类型推断是否列表结构（满足任一即可继续）：

- **分页列表**：存在 `total` 且存在数组字段 `data/list/items/rows` 等
- **非分页列表**：响应主体是数组，或存在明显的数组字段

若无法判断，直接问用户确认：

```text
从类型上看它像列表结构（包含数组字段/分页字段）。这个接口就是用于列表页数据源吗？（是/否）
```

若用户回答“否”，则停止列表页生成，仅保留已生成的接口文件，并询问用户下一步想生成什么页面。

### 5) 收集：表格列字段 / 搜索项字段 / 操作列（必须让用户确认）

> 注意：这一步必须“问 + 结构化整理 + 回显确认”闭环完成；**只要用户没确认，就不要开始写列表页代码**。

#### 5.1 先问表格列（从“列表项字段”里选）

```text
你希望表格展示哪些列？请按字段名列出来（可附：标题/宽度/对齐/格式化：日期、金额、枚举映射等）。
```

整理为结构化信息：

- **columns**：`[{ field, title?, width?, align?, renderType? }]`

#### 5.2 再问是否需要操作列（在列确认之后）

```text
需要“操作列”吗？如果需要，包含哪些操作（例如：详情/编辑/删除/启用禁用），是否需要二次确认或权限控制？
```

整理为结构化信息：

- **actions**：`{ enabled: boolean, actions?: [{ key, label, confirm?, permission? }] }`

#### 5.3 最后问搜索项（查询条件）

```text
你希望哪些字段作为搜索项（查询条件）？每个字段想用什么控件（输入框/下拉/日期/范围/级联等）？
```

整理为结构化信息：

- **searchItems**：`[{ field, label?, controlType?, optionsSource?, defaultValue? }]`

> 将三块信息（columns/actions/searchItems）回显给用户，请用户确认“就按这个生成”再继续落地代码。

### 6) 按范式生成列表页（只用 Hooks）

严格参考并遵守：

- `DOC/LIST_PAGE_PATTERN.md`

生成列表页代码时必须包含（与范式一致，缺一不可）：

- `defaultParams`（包含 `pageNo/pageSize`；如有 Tab 则包含 `tabKey` 默认值）
- `useRequest(apiFn, { manual: true })`，通过 `run(params)` 发起请求
- `handleSearch(params)`：唯一入口，内部调用 `run(params)`
- `tableConfig(handleSearch, list, extraState?)`：返回形状符合范式中的 `ZcyList contract`
- 渲染：`Spin` + `ZcyBreadcrumb`（可选）+ `ZcyList`
- 在 hooks 层把接口响应 **统一解包成**：`{ data: T[]; total: number }`，避免在 `tableConfig` 里写 `result?.data?.list` 这类分支

接口文件引用规则：

- 从第 3 步生成的文件中 import `fnName` 对应的请求函数与类型
- 若用户要求把接口文件放进 `services` 体系（例如统一出口文件），则按项目习惯补齐导出（必要时新增 `index.ts` 聚合导出）

### 7) 不满足范式时的兜底策略（必须执行）

如果 `LIST_PAGE_PATTERN.md` 的范式无法覆盖用户需求（例如已有项目自定义列表页封装、不同 UI 组件、特殊分页字段等）：

- 在目标项目里搜索现有“列表页”实现（优先找 `ZcyList` + `useRequest` + `tableConfig` 的页面）
- 选择最相近的页面作为参考，保持其目录结构/命名/接口解包方式一致
- 仍然必须输出 **React Hooks** 组件（禁止 class）

## 生成前检查清单（必须逐项满足）

开始生成/写入列表页代码前，必须确认以下事项都已完成：

- 已询问并拿到用户答案：
  - 列表页生成位置：`listPageOutPath`
  - 接口文件生成位置：`apiOutDir`
- 已调用 MCP 生成接口文件，并拿到：
  - `data.filePath`、`data.fnName`
- 已完成字段确认闭环（且用户已明确确认“就按这个生成”）：
  - 表格列：`columns`
  - 操作列：`actions`
  - 搜索项：`searchItems`
- 列表页代码包含“第 6 步必须包含”的全部要素（与范式一致）
- 若范式不适配，已执行“第 7 步兜底策略”并仍保持 Hooks 实现

## 最终输出（对话与代码产物）

至少给出这份汇总（可复制）：

```text
生成结果汇总
- 列表页输出：<listPageOutPath>
- 接口文件输出目录：<apiOutDir>
- 生成的接口文件：<data.filePath>
- 生成的接口函数名：<data.fnName>

列表字段确认
- 搜索项：<...>
- 表格列：<...>
- 操作列：<...>
```

并在仓库中写入/更新：

- 列表页文件：`<listPageOutPath>`（React Hooks）
- 接口文件：由 MCP 已生成并落盘（位于 `<apiOutDir>`）

