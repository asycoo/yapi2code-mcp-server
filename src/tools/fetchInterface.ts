import axios from 'axios';
import type { InterfaceDetail, YapiEnvelope } from '../types.js';

function normalizeBaseUrl(baseUrl: string): string {
	return baseUrl.replace(/\/+$/, '');
}

/**
 * 调用 YApi 开放接口获取接口详情（与 VS Code 插件中 yapiApi.getInterfaceDetail 一致）
 */
export async function fetchInterfaceDetail(
	baseUrl: string,
	interfaceId: number,
	token?: string,
): Promise<{ ok: true; data: InterfaceDetail } | { ok: false; message: string }> {
	const root = normalizeBaseUrl(baseUrl);
	const url = `${root}/api/interface/get`;
	try {
		const res = await axios.get<YapiEnvelope<InterfaceDetail>>(url, {
			params: {
				id: interfaceId,
				...(token ? { token } : {}),
			},
			timeout: 30_000,
			headers: { 'User-Agent': 'yapi2code-mcp-server/0.1.0' },
		});
		const body = res.data;
		if (body.errcode !== 0) {
			return { ok: false, message: body.errmsg || `errcode=${body.errcode}` };
		}
		return { ok: true, data: body.data };
	} catch (e: unknown) {
		const msg = e instanceof Error ? e.message : String(e);
		return { ok: false, message: msg };
	}
}
