import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'node:path';

type ToolResult = { content?: { type: string; text?: string }[] };

function parseTextJson(r: ToolResult) {
	const t = r?.content?.find((c) => c.type === 'text')?.text;
	if (!t) return { ok: false as const, error: 'no text content', raw: r };
	try {
		return { ok: true as const, data: JSON.parse(t) };
	} catch (e) {
		return { ok: false as const, error: 'text not json', text: t, raw: r };
	}
}

async function main() {
	const cwd = process.cwd();
	const serverEntry = 'dist/server.js';
	const transport = new StdioClientTransport({
		command: 'node',
		args: [serverEntry],
		cwd,
	});

	const client = new Client(
		{ name: 'yapi2code-mcp-selftest', version: '0.1.0' },
		{ capabilities: {} },
	);

	await client.connect(transport);

	// 1) read_config
	const r1 = (await client.callTool({
		name: 'read_config',
		arguments: { projectPath: process.cwd() },
	})) as any as ToolResult;
	const j1 = parseTextJson(r1);
	console.log('read_config =>', j1.ok ? j1.data : j1);
	if (!j1.ok || !j1.data?.success) throw new Error('read_config failed');

	const remoteUrl = j1.data.data.config.remoteUrl as string;

	// 2) get_yapi_data listAll
	const r2 = (await client.callTool({
		name: 'get_yapi_data',
		arguments: { remoteUrl, listAll: true },
	})) as any as ToolResult;
	const j2 = parseTextJson(r2);
	console.log('get_yapi_data(listAll) =>', j2.ok ? { success: j2.data?.success, total: j2.data?.data?.total } : j2);
	if (!j2.ok || !j2.data?.success) throw new Error('get_yapi_data listAll failed');

	const first = j2.data.data.interfaces?.[0];
	if (!first?.path || !first?.method) {
		throw new Error('no interface item from listAll');
	}

	// 3) generate_yapi2code_from_remote
	const r3 = (await client.callTool({
		name: 'generate_yapi2code_from_remote',
		arguments: {
			interfacePath: first.path,
			method: first.method,
			// 不传 remoteUrl，验证会从 yapi.config.json 自动读取
			projectPath: process.cwd(),
		},
	})) as any as ToolResult;
	const j3 = parseTextJson(r3);
	console.log('generate_yapi2code_from_remote =>', j3.ok ? { success: j3.data?.success, fnName: j3.data?.data?.fnName } : j3);
	if (!j3.ok || !j3.data?.success) throw new Error('generate_yapi2code_from_remote failed');

	// 最后打印一小段代码预览（避免刷屏）
	const code = j3.data.data.fullCode as string;
	console.log('\n--- code preview (first 20 lines) ---');
	console.log(code.split('\n').slice(0, 20).join('\n'));

	await client.close();
}

main().catch((e) => {
	console.error('SELFTEST_FAILED', e);
	process.exit(1);
});

