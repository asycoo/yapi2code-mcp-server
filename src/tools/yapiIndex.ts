import type { YApiCategory, YApiInterfaceLite } from './getYapiData.js';

/**
 * 在 remoteUrl 导出的分类数组里找接口条目：
 * - 传 method：按 path + method 精确匹配
 * - 不传 method：按 path 匹配；若命中多个，按常见优先级自动选择（GET > POST > PUT > DELETE > PATCH）
 * 注意：导出数据里可能不包含 req_query/req_body_other/res_body 等字段，取决于导出参数（export-full vs export）。
 */
export function findInterfaceFromCategories(
	categories: YApiCategory[],
	interfacePath: string,
	method?: string,
): (YApiInterfaceLite & Record<string, any>) | null {
	const normalizePath = (p: string) => (p.length > 1 ? p.replace(/\/+$/, '') : p);
	const path = normalizePath(interfacePath);

	const m = method?.toLowerCase();
	for (const cat of categories) {
		const list = Array.isArray(cat.list) ? cat.list : [];
		for (const api of list) {
			if (normalizePath(api.path) !== path) continue;
			if (m) {
				if (api.method.toLowerCase() === m) return api as any;
			} else {
				// method 未指定：先收集，后面按优先级挑
			}
		}
	}

	if (m) return null;

	const matches: (YApiInterfaceLite & Record<string, any>)[] = [];
	for (const cat of categories) {
		const list = Array.isArray(cat.list) ? cat.list : [];
		for (const api of list) {
			if (normalizePath(api.path) === path) matches.push(api as any);
		}
	}
	if (matches.length === 0) return null;
	if (matches.length === 1) return matches[0];

	const priority = ['get', 'post', 'put', 'delete', 'patch'];
	matches.sort((a, b) => {
		const ai = priority.indexOf(String(a.method).toLowerCase());
		const bi = priority.indexOf(String(b.method).toLowerCase());
		return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
	});
	return matches[0];
}

