import axios from 'axios';

export interface YApiInterfaceLite {
	_id?: number;
	title: string;
	path: string;
	method: string;
	status?: string;
	tag?: unknown;
	[key: string]: unknown;
}

export interface YApiCategory {
	name?: string;
	desc?: string;
	list?: YApiInterfaceLite[];
	[key: string]: unknown;
}

type CacheEntry = { expiresAt: number; data: YApiCategory[] };
const memoryCache = new Map<string, CacheEntry>();

const DEFAULT_TIMEOUT_MS = 120_000;

function now() {
	return Date.now();
}

function getCache(key: string) {
	const hit = memoryCache.get(key);
	if (!hit) return undefined;
	if (hit.expiresAt <= now()) {
		memoryCache.delete(key);
		return undefined;
	}
	return hit.data;
}

function setCache(key: string, data: YApiCategory[], ttlMs: number) {
	memoryCache.set(key, { expiresAt: now() + ttlMs, data });
}

async function fetchYApiData(
	remoteUrl: string,
	forceRefresh = false,
	timeoutMs?: number,
): Promise<YApiCategory[]> {
	const cacheKey = `yapi:data:${remoteUrl}`;
	if (!forceRefresh) {
		const cached = getCache(cacheKey);
		if (cached) return cached;
	}

	const resp = await axios.get(remoteUrl, {
		timeout:
			typeof timeoutMs === 'number' && Number.isFinite(timeoutMs) && timeoutMs > 0
				? timeoutMs
				: DEFAULT_TIMEOUT_MS,
		headers: { 'User-Agent': 'yapi2code-mcp-server/0.1.0' },
	});

	if (resp.status !== 200) {
		throw new Error(`HTTP请求失败，状态码: ${resp.status}`);
	}
	if (!Array.isArray(resp.data)) {
		throw new Error('YApi返回数据格式不正确，期望为数组格式');
	}

	const data = resp.data as YApiCategory[];
	setCache(cacheKey, data, 30 * 60 * 1000);
	return data;
}

function getAllInterfaces(yapiData: YApiCategory[]) {
	const interfaces: any[] = [];
	for (const category of yapiData) {
		const list = Array.isArray(category.list) ? category.list : [];
		for (const api of list) {
			interfaces.push({
				id: (api as any)._id,
				title: api.title,
				path: api.path,
				method: api.method,
				categoryName: category.name,
				categoryDesc: category.desc,
				status: (api as any).status,
				tag: (api as any).tag,
			});
		}
	}
	return interfaces;
}

export async function getYApiData(params: {
	remoteUrl: string;
	interfacePath?: string;
	method?: string;
	listAll?: boolean;
	forceRefresh?: boolean;
	timeoutMs?: number;
}): Promise<any> {
	try {
		const { remoteUrl, interfacePath, method, listAll, forceRefresh = false, timeoutMs } = params;
		if (!remoteUrl) throw new Error('remoteUrl参数不能为空');

		const yapiData = await fetchYApiData(remoteUrl, forceRefresh, timeoutMs);

		if (listAll) {
			const interfaces = getAllInterfaces(yapiData);
			return {
				success: true,
				message: `成功获取${interfaces.length}个接口`,
				data: {
					total: interfaces.length,
					interfaces,
				},
			};
		}

		if (interfacePath) {
			// 不传 method 时按 path 查找；若多个方法同 path，按优先级自动选择
			const normalizePath = (p: string) => (p.length > 1 ? p.replace(/\/+$/, '') : p);
			const path = normalizePath(interfacePath);
			const m = method?.toLowerCase();

			const matches: any[] = [];
			for (const cat of yapiData) {
				for (const api of cat.list ?? []) {
					if (normalizePath(api.path) !== path) continue;
					if (m) {
						if (api.method.toLowerCase() === m) {
							return {
								success: true,
								message: '成功获取接口详情',
								data: { ...api, categoryName: cat.name, categoryDesc: cat.desc },
							};
						}
					} else {
						matches.push({ api, cat });
					}
				}
			}

			if (m) return { success: false, message: `未找到接口: ${method!.toUpperCase()} ${interfacePath}` };
			if (matches.length === 0) return { success: false, message: `未找到接口: ${interfacePath}` };

			if (matches.length > 1) {
				const priority = ['get', 'post', 'put', 'delete', 'patch'];
				matches.sort((a, b) => {
					const ai = priority.indexOf(String(a.api.method).toLowerCase());
					const bi = priority.indexOf(String(b.api.method).toLowerCase());
					return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
				});
			}

			const pick = matches[0];
			return {
				success: true,
				message:
					matches.length === 1
						? '成功获取接口详情'
						: `成功获取接口详情（同路径存在多个方法，已自动选择 ${String(pick.api.method).toUpperCase()}）`,
				data: { ...pick.api, categoryName: pick.cat.name, categoryDesc: pick.cat.desc },
			};
		}

		return { success: true, message: '成功获取YApi完整数据', data: yapiData };
	} catch (e: any) {
		return {
			success: false,
			message: `获取YApi数据失败: ${e?.message ?? String(e)}`,
			error: e?.message ?? String(e),
		};
	}
}

