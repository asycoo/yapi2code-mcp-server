# 列表页范式（供 AI 生成参考）

本文档总结本项目常见**列表页（List Page）**实现范式，目标是让 AI 在生成列表页时：

- **完全贴合本项目既有写法**（`doraemon` 的 `ZcyList` + `config`/hook 生成配置）
- **统一参数与数据结构**（搜索、分页、Tab、合并行）
- **使用 React 函数组件**实现（本范式选择：Hooks + `ahooks/useRequest` 或自定义 hook）

---

## 0. 一句话原则（写给 AI 的硬规则）

- **列表页渲染 = `ZcyBreadcrumb`（可选） + `ZcyList`（必选）**
- **列表页行为 = 提供 `onSearch(params)` 给 `ZcyList`，由它驱动查询/分页/Tab**
- **列表页配置 = `tableConfig(onSearch, data, extraState?)` 返回固定形状**
- **请求/状态 = hooks 承接**：`useRequest(api, { manual: true })` + `run(params)` + `data/result` 映射给 `tableConfig`

---

## 1. 你必须遵守的配置形状（ZcyList contract）

### 1.1 `tableConfig` 返回值形状（最小集合）

```ts
type ZcyListConfig = {
  tabs?: {
    tabList: Array<{ label: string; key?: string | number; value?: string | number }>;
    defaultActiveKey?: string;
  };
  tabKey?: string; // Tab 对应的查询字段名，例如：queryType / type

  customItem?: Array<{
    label: string;
    id: string; // 对应查询字段名
    render: () => React.ReactNode;
  }>;

  table: {
    columns: any[]; // 列配置（与 doraemon Table 兼容）
    dataSource: any[];
    rowKey?: string;
    bordered?: boolean;
    locale?: { emptyText?: string };
    rowSelection?: any; // 需要勾选/批量操作时
    pagination?: false | {
      current?: number;
      pageSize?: number;
      total: number;
      showSizeChanger?: boolean;
      showQuickJumper?: { goButton: boolean };
    };
  };

  onSearch: (params: any) => void;
};
```

### 1.2 数据结构约定（列表响应）

项目里常见的数据结构（来自实际页面）：

- **列表数据**：`data`（数组）
- **总数**：`total`（数字）

因此推荐在 hooks 层统一成：

```ts
type ListResult<T> = { data: T[]; total: number };
```

> 如果后端返回包裹在 `result` 内（例如 `data.result.data`），在 hooks 层做一次解包即可，避免在 `config` 层写业务判断。

---

## 2. 列表页类型总览（本项目常见）

- **普通列表页**：搜索项 + 表格 + 分页
- **带 Tab 的列表页**：Tab 切换时带上 `tabKey` 对应的查询字段
- **带初始搜索项的列表页**：进入页面自动以默认参数发起查询（常见：year/type/pageNo/pageSize）
- **合并行列表页（rowSpan）**：将嵌套数据“打平”为表格行，并在列 `render` 返回 `{ props: { rowSpan }, children }`

---

## 3. 通用模板（推荐直接复制）

下面这份模板覆盖：初始化查询、搜索回调、分页参数、加载态。

```tsx
import React, { useCallback, useEffect, useMemo } from 'react';
import { Spin, ZcyList, ZcyBreadcrumb } from 'doraemon';
import { useRequest } from 'ahooks';

type QueryParams = {
  pageNo: number;
  pageSize: number;
  // ... 其它查询字段（与 customItem.id / tabKey 对齐）
};

type Row = {
  id: string;
  // ... 表格字段
};

type ListResult<T> = { data: T[]; total: number };

async function fetchList(params: QueryParams): Promise<ListResult<Row>> {
  // TODO: 替换为实际 services/api
  return { data: [], total: 0 };
}

const defaultParams: QueryParams = {
  pageNo: 1,
  pageSize: 10,
};

function tableConfig(handleSearch: (p: QueryParams) => void, list?: ListResult<Row>) {
  return {
    customItem: [
      // { label: '名称', id: 'name', render: () => <Input /> },
    ],
    tabKey: 'queryType',
    table: {
      columns: [
        // { title: 'ID', dataIndex: 'id' },
      ],
      dataSource: list?.data || [],
      pagination: {
        showQuickJumper: { goButton: true },
        showSizeChanger: true,
        total: Number(list?.total || 0),
      },
      rowKey: 'id',
      bordered: true,
      locale: { emptyText: '暂无数据' },
    },
    onSearch: handleSearch,
  };
}

const DemoListPage: React.FC = () => {
  const { data, loading, run } = useRequest(fetchList, {
    manual: true,
  });

  const handleSearch = useCallback(
    (params: QueryParams) => {
      run(params);
    },
    [run]
  );

  useEffect(() => {
    run(defaultParams);
  }, [run]);

  const list = useMemo(() => data, [data]);

  return (
    <div>
      <Spin spinning={loading} size="large">
        <ZcyBreadcrumb routes={[{ label: '列表页', to: '' }]} />
        <ZcyList {...tableConfig(handleSearch, list)} />
      </Spin>
    </div>
  );
};

export default DemoListPage;
```

---

## 4. 案例 A：普通列表页（搜索 + 分页）

要点：

- `customItem` 定义搜索项（`id` 必须与后端字段一致）
- `table.pagination.total` 取 `total`
- `onSearch` 统一走 `handleSearch(params)`，由它调用 `run(params)`

```tsx
import React, { useCallback, useEffect } from 'react';
import { Spin, ZcyList, ZcyBreadcrumb, Input, Select } from 'doraemon';
import { useRequest } from 'ahooks';

type QueryParams = {
  supplierName?: string | null;
  supplierType?: number | null;
  pageNo: number;
  pageSize: number;
};

type Row = { id: string; supplierName: string; supplierTypeName: string };
type ListResult<T> = { data: T[]; total: number };

async function queryList(params: QueryParams): Promise<ListResult<Row>> {
  // 替换为实际 services
  return { data: [], total: 0 };
}

const defaultParams: QueryParams = {
  supplierName: null,
  supplierType: null,
  pageNo: 1,
  pageSize: 10,
};

const tableConfig = (handleSearch: (p: QueryParams) => void, list?: ListResult<Row>) => ({
  customItem: [
    {
      label: '参与银行总行名称',
      id: 'supplierName',
      render: () => <Input autoComplete="off" />,
    },
    {
      label: '银行类型',
      id: 'supplierType',
      render: () => (
        <Select placeholder="请选择" allowClear>
          <Select.Option value={1}>外资银行</Select.Option>
          <Select.Option value={2}>农合机构</Select.Option>
        </Select>
      ),
    },
  ],
  table: {
    columns: [
      { title: '参与银行总行名称', dataIndex: 'supplierName', width: '70%' },
      { title: '银行类型', dataIndex: 'supplierTypeName', width: '30%' },
    ],
    dataSource: list?.data || [],
    bordered: true,
    pagination: {
      showQuickJumper: { goButton: true },
      showSizeChanger: true,
      total: Number(list?.total || 0),
    },
    rowKey: 'id',
    locale: { emptyText: '暂无数据' },
  },
  onSearch: handleSearch,
});

const NormalListPage: React.FC = () => {
  const { data, loading, run } = useRequest(queryList, { manual: true });

  const handleSearch = useCallback((params: QueryParams) => run(params), [run]);

  useEffect(() => {
    run(defaultParams);
  }, [run]);

  return (
    <Spin spinning={loading} size="large">
      <ZcyBreadcrumb routes={[{ label: '普通列表', to: '' }]} />
      <ZcyList {...tableConfig(handleSearch, data)} />
    </Spin>
  );
};

export default NormalListPage;
```

---

## 5. 案例 B：带 Tab 的列表页（tabKey 驱动查询字段）

要点（与项目一致）：

- `tabs.tabList` + `tabs.defaultActiveKey`
- `tabKey` 指定 Tab 值写入的字段名（常见：`queryType` / `type`）
- 进入页面初始化时，`defaultParams` 里要包含 `tabKey` 的默认值

```tsx
import React, { useCallback, useEffect } from 'react';
import { Spin, ZcyList, ZcyBreadcrumb, Input } from 'doraemon';
import { useRequest } from 'ahooks';

type QueryParams = {
  queryType: 1 | 2; // 1=待办理，2=全部（示例）
  projectNo?: string;
  projectName?: string;
  pageNo: number;
  pageSize: number;
};

type Row = { id: string; projectNo: string; projectName: string; statusName: string };
type ListResult<T> = { data: T[]; total: number };

async function queryList(params: QueryParams): Promise<ListResult<Row>> {
  return { data: [], total: 0 };
}

const defaultParams: QueryParams = {
  queryType: 1,
  pageNo: 1,
  pageSize: 10,
};

const tableConfig = (handleSearch: (p: QueryParams) => void, list?: ListResult<Row>) => ({
  tabs: {
    tabList: [
      { label: '全部', value: 2, key: 2 },
      { label: '待办理', value: 1, key: 1 },
    ],
    defaultActiveKey: '1',
  },
  tabKey: 'queryType',
  customItem: [
    { label: '项目编号', id: 'projectNo', render: () => <Input autoComplete="off" /> },
    { label: '项目名称', id: 'projectName', render: () => <Input autoComplete="off" /> },
  ],
  table: {
    columns: [
      { title: '项目编号', dataIndex: 'projectNo', width: 200 },
      { title: '项目名称', dataIndex: 'projectName' },
      { title: '状态', dataIndex: 'statusName', width: 120 },
    ],
    dataSource: list?.data || [],
    pagination: {
      showQuickJumper: { goButton: true },
      showSizeChanger: true,
      total: Number(list?.total || 0),
    },
    rowKey: 'id',
  },
  onSearch: handleSearch,
});

const TabListPage: React.FC = () => {
  const { data, loading, run } = useRequest(queryList, { manual: true });
  const handleSearch = useCallback((params: QueryParams) => run(params), [run]);

  useEffect(() => {
    run(defaultParams);
  }, [run]);

  return (
    <Spin spinning={loading} size="large">
      <ZcyBreadcrumb routes={[{ label: '带 Tab 列表', to: '' }]} />
      <ZcyList {...tableConfig(handleSearch, data)} />
    </Spin>
  );
};

export default TabListPage;
```

---

## 6. 案例 C：带“初始搜索项”的列表页（默认 year/type 等）

要点（与项目一致）：

- 定义 `defaultParams`，包含默认搜索字段（例如：`year = 当前年`、`type = 1/2`）
- `handleSearch` 内可“强制补齐”某些字段（例如 year 总是当前年），避免被 UI 清空导致后端异常

```tsx
import React, { useCallback, useEffect, useMemo } from 'react';
import { Spin, ZcyList, ZcyBreadcrumb, message, Upload } from 'doraemon';
import { useRequest } from 'ahooks';

type QueryParams = {
  year: number;
  type: 1 | 2;
  pageNo: number;
  pageSize: number;
};

type Row = { id: string; supplierName: string; supplierTypeName: string };
type ListResult<T> = { data: T[]; total: number };

async function queryList(params: QueryParams): Promise<ListResult<Row>> {
  return { data: [], total: 0 };
}

async function queryExportFile(params: { type: 1 | 2 }): Promise<{ uploadFile?: any }> {
  return { uploadFile: undefined };
}

const curYear = new Date().getFullYear();
const defaultParams: QueryParams = { year: curYear, type: 1, pageNo: 1, pageSize: 10 };

const tableConfig = (handleSearch: (p: QueryParams) => void, list?: ListResult<Row>) => ({
  tabs: { tabList: [{ label: '全量银行团列表', key: 1 }] },
  tabKey: 'queryType',
  customItem: [],
  table: {
    columns: [
      { title: '参与银行总行名称', dataIndex: 'supplierName', width: '70%' },
      { title: '银行类型', dataIndex: 'supplierTypeName', width: '30%' },
    ],
    dataSource: list?.data || [],
    bordered: true,
    pagination: {
      showQuickJumper: { goButton: true },
      showSizeChanger: true,
      total: Number(list?.total || 0),
    },
    rowKey: 'id',
    locale: { emptyText: '暂无数据' },
  },
  onSearch: handleSearch,
});

const WithInitialFiltersListPage: React.FC<{ userType?: 'finance' | 'unit' }> = ({
  userType = 'finance',
}) => {
  const type = useMemo(() => (userType === 'unit' ? 2 : 1), [userType]);
  const { data, loading, run } = useRequest(queryList, { manual: true });

  const handleSearch = useCallback(
    (params: QueryParams) => {
      run({ ...params, year: curYear, type });
    },
    [run, type]
  );

  useEffect(() => {
    run({ ...defaultParams, type });
  }, [run, type]);

  const downloadFile = async () => {
    try {
      const { uploadFile } = await queryExportFile({ type });
      if (uploadFile) {
        const url = await Upload.getFileUrl(uploadFile);
        window.open(url);
        return;
      }
      message.info('当前文件为空');
    } catch {
      message.info('下载失败');
    }
  };

  return (
    <Spin spinning={loading} size="large">
      <ZcyBreadcrumb
        routes={[{ label: '带初始搜索项列表', to: '' }]}
        globalBtn={[{ label: '下载文件', onClick: downloadFile }]}
      />
      <ZcyList {...tableConfig(handleSearch, data)} />
    </Spin>
  );
};

export default WithInitialFiltersListPage;
```

---

## 7. 案例 D：合并行列表页（rowSpan）

### 7.1 核心思路

1. 后端返回“父记录 + 子数组”（例如：`depositDeadline: []`）
2. 在 hooks 层把数据 **打平** 为表格行：每个子项变成一行
3. 为需要合并展示的列计算 `rowSpan`：
   - 父记录的第一行：`rowSpan = 子数组长度`
   - 父记录的其余行：`rowSpan = 0`
4. 在 `columns[].render` 返回：
   - `{ props: { rowSpan }, children: value }`

### 7.2 最小完整案例

```tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Spin, ZcyList, ZcyBreadcrumb, Input } from 'doraemon';
import { useRequest } from 'ahooks';

type ApiItem = {
  projectId: string;
  projectName: string;
  totalAmount: string;
  depositDeadline: Array<{ itemNo: string; desc: string; depositScale?: number }>;
};

type QueryParams = { type: '1' | '2'; pageNo: number; pageSize: number; projectName?: string };

type TableRow = {
  key: string;
  rowSpan: number;
  projectId: string;
  projectName: string;
  totalAmount: string;
  itemNo: string;
  desc: string;
  depositScale?: number;
};

type ListResult<T> = { data: T[]; total: number };

async function fetchApi(params: QueryParams): Promise<ListResult<ApiItem>> {
  return { data: [], total: 0 };
}

const defaultParams: QueryParams = { type: '1', pageNo: 1, pageSize: 10 };

function flattenWithRowSpan(list?: ListResult<ApiItem>): ListResult<TableRow> | undefined {
  if (!list) return undefined;
  const rows: TableRow[] = [];
  list.data.forEach((item) => {
    const children = item.depositDeadline || [];
    children.forEach((t, i) => {
      rows.push({
        key: `${item.projectId}-${t.itemNo}`,
        rowSpan: i === 0 ? children.length : 0,
        projectId: item.projectId,
        projectName: item.projectName,
        totalAmount: item.totalAmount,
        itemNo: t.itemNo,
        desc: t.desc,
        depositScale: t.depositScale,
      });
    });
  });
  return { data: rows, total: list.total };
}

const tableConfig = (handleSearch: (p: QueryParams) => void, list?: ListResult<TableRow>) => ({
  customItem: [
    { label: '项目名称', id: 'projectName', render: () => <Input autoComplete="off" /> },
  ],
  tabs: {
    tabList: [
      { label: '全部', value: 2, key: 2 },
      { label: '待办理', value: 1, key: 1 },
    ],
    defaultActiveKey: '1',
  },
  tabKey: 'type',
  table: {
    columns: [
      {
        title: '项目名称',
        dataIndex: 'projectName',
        render: (v: string, r: TableRow) => ({ props: { rowSpan: r.rowSpan }, children: v }),
      },
      {
        title: '规模(亿元)',
        dataIndex: 'totalAmount',
        width: 160,
        align: 'right',
        render: (v: string, r: TableRow) => ({
          props: { rowSpan: r.rowSpan },
          children: <span className="money">{v}</span>,
        }),
      },
      {
        title: '存款期限(月)',
        dataIndex: 'desc',
        width: 180,
      },
    ],
    dataSource: list?.data || [],
    pagination: {
      showQuickJumper: { goButton: true },
      showSizeChanger: true,
      total: Number(list?.total || 0),
    },
    rowKey: 'key',
  },
  onSearch: handleSearch,
});

const RowSpanListPage: React.FC = () => {
  const { data: apiData, loading, run } = useRequest(fetchApi, { manual: true });
  const [searchParams, setSearchParams] = useState<QueryParams>(defaultParams);

  const list = useMemo(() => flattenWithRowSpan(apiData), [apiData]);

  const handleSearch = useCallback(
    (params: QueryParams) => {
      setSearchParams(params);
      run(params);
    },
    [run]
  );

  useEffect(() => {
    handleSearch(defaultParams);
  }, [handleSearch]);

  return (
    <Spin spinning={loading} size="large">
      <ZcyBreadcrumb routes={[{ label: '合并行列表', to: '' }]} />
      <ZcyList {...tableConfig(handleSearch, list)} />
    </Spin>
  );
};

export default RowSpanListPage;
```

---

## 8. 常用增强模式（可选但常见）

### 8.1 面包屑右侧全局按钮（`globalBtn`）

```tsx
<ZcyBreadcrumb
  routes={[{ label: '列表页', to: '' }]}
  globalBtn={[
    { label: '新增', type: 'primary', onClick: () => {} },
    { label: '下载', onClick: () => {} },
  ]}
/>
```

### 8.2 列表批量按钮（`batchBtn`）

```tsx
<ZcyList
  batchBtn={[
    {
      label: '复制',
      type: 'secondary',
      handleClick: () => {},
      disabled: true, // 通常由 selectedRows.length 控制
    },
  ]}
  {...config}
/>
```

### 8.3 勾选行与 `rowSelection`

`table.rowSelection.selectedRowKeys` 与业务选中行状态保持一致（常见：`selectedRows.map((x) => x.id)`）。

---

## 9. 反例与踩坑清单（AI 必须避免）

- **Tab 不生效**：忘记设置 `tabKey`，或 `defaultParams` 缺少 `tabKey` 对应字段。
- **分页不正确**：只传了 `total`，但需要受控时没传 `current/pageSize`（当页面自己维护 `searchParams` 时应补齐）。
- **合并行错乱**：
  - 没在 hooks 层把数据打平，直接在 `render` 里做复杂逻辑；
  - `rowSpan` 未按“第一行=长度，其余=0”计算；
  - `rowKey` 不稳定导致合并行抖动（必须是稳定唯一值，如 `${projectId}-${itemNo}`）。
- **把“解包数据结构”放到 config 层**：应在 hooks 层统一成 `{ data, total }`，避免 config 里出现 `data.result?.data` 之类的分支。

---

## 10. AI 生成列表页时的输出清单（你必须输出这些）

- `defaultParams`（包含 `pageNo/pageSize`，有 Tab 时包含 `tabKey` 字段）
- `handleSearch(params)`（唯一入口，内部调用 `run(params)`）
- `tableConfig(handleSearch, list)`（返回形状符合本文 `ZcyList contract`）
- 页面组件使用 `Spin + ZcyBreadcrumb(可选) + ZcyList`

