#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
	generateYapi2codeFromRemoteSchema,
	getYApiDataSchema,
	readConfigSchema,
} from './schema.js';
import { runGenerateCode } from './tools/generateCodeTool.js';
import { readConfig } from './tools/readConfig.js';
import { getYApiData, type YApiCategory } from './tools/getYapiData.js';
import { findInterfaceFromCategories } from './tools/yapiIndex.js';
import { writeGeneratedFile } from './tools/writeGeneratedFile.js';

function jsonText(payload: unknown) {
	return {
		content: [
			{
				type: 'text' as const,
				text: JSON.stringify(payload, null, 2),
			},
		],
	};
}

const server = new McpServer({
	name: 'yapi2code-mcp-server',
	version: '0.1.0',
});

server.tool('read_config', readConfigSchema, async ({ projectPath }) => {
	const result = await readConfig({ projectPath });
	return jsonText(result);
});

server.tool('get_yapi_data', getYApiDataSchema, async (params) => {
	const result = await getYApiData(params);
	return jsonText(result);
});

server.tool(
	'generate_yapi2code_from_remote',
	generateYapi2codeFromRemoteSchema,
	async ({ remoteUrl, interfacePath, method, importStatement, projectPath, outputDir, forceRefresh, timeoutMs }) => {
		let projectRoot = process.cwd();
		let cfgTimeoutMs: number | undefined;
		if (projectPath) {
			const cfg = await readConfig({ projectPath });
			if (cfg.success) projectRoot = cfg.data.projectPath;
		}
		let resolvedRemoteUrl = remoteUrl;
		if (!resolvedRemoteUrl) {
			const cfg = await readConfig({ projectPath });
			if (!cfg.success) return jsonText(cfg);
			resolvedRemoteUrl = cfg.data.config.remoteUrl as string;
			cfgTimeoutMs = cfg.data.config.timeoutMs as number | undefined;
			projectRoot = cfg.data.projectPath;
		}

		const yapiDataResp = await getYApiData({
			remoteUrl: resolvedRemoteUrl!,
			forceRefresh,
			timeoutMs: timeoutMs ?? cfgTimeoutMs,
		});
		if (!yapiDataResp.success) return jsonText(yapiDataResp);

		const categories = yapiDataResp.data as YApiCategory[];
		const api = findInterfaceFromCategories(categories, interfacePath, method);
		if (!api) {
			return jsonText({
				success: false,
				message: method
					? `未找到接口: ${method.toUpperCase()} ${interfacePath}`
					: `未找到接口: ${interfacePath}`,
				categories
			});
		}

		const out = runGenerateCode(
			{
				title: api.title,
				path: api.path,
				method: api.method,
				req_query: (api as any).req_query ?? [],
				req_body_other: (api as any).req_body_other ?? '',
				res_body: (api as any).res_body ?? '',
			},
			importStatement,
		);

		const saved = writeGeneratedFile({
			projectRoot,
			outputDir,
			fnName: out.fnName,
			code: out.fullCode,
		});

		return jsonText({
			success: true,
			data: {
				fnName: out.fnName,
				filePath: saved.filePath,
				fullCode: out.fullCode,
				reqQueryType: out.reqQueryType,
				reqBodyType: out.reqBodyType,
				resBodyType: out.resBodyType,
				resDataType: out.resDataType,
				requestFn: out.requestFn,
			},
		});
	},
);

async function main() {
	try {
		console.error('启动 yapi2code MCP 服务 (stdio)');
		const transport = new StdioServerTransport();
		await server.connect(transport);
	} catch (e) {
		console.error('启动失败:', e);
		process.exit(1);
	}
}

main();

