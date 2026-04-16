import { z } from 'zod';

export const readConfigSchema = {
	projectPath: z.string().optional().describe('项目路径，如果不提供则使用当前工作目录'),
};

export const getYApiDataSchema = {
	remoteUrl: z.string().describe('YApi导出接口URL（返回分类数组）'),
	interfacePath: z.string().optional().describe('指定接口路径'),
	method: z.string().optional().describe('请求方法；不传则按 path 自动匹配'),
	listAll: z.boolean().optional().describe('是否列出所有接口'),
	forceRefresh: z.boolean().optional().describe('是否强制刷新缓存，默认false'),
	timeoutMs: z.number().int().positive().optional().describe('HTTP请求超时（毫秒），默认120000'),
};

export const generateYapi2codeFromRemoteSchema = {
	remoteUrl: z.string().optional().describe('YApi导出接口URL；不传则从 yapi.config.json 读取'),
	interfacePath: z.string().describe('接口路径，如 /api/user/list'),
	method: z.string().optional().describe('请求方法；不传则按 path 自动匹配'),
	importStatement: z
		.string()
		.optional()
		.describe('文件顶部 request 导入语句，默认 import {request} from \'doraemon\';'),
	projectPath: z.string().optional().describe('用于定位 yapi.config.json 的项目路径（可选）'),
	outputDir: z
		.string()
		.optional()
		.describe('生成文件输出目录（相对 projectPath/当前工作目录），默认 src/yapi'),
	forceRefresh: z.boolean().optional().describe('是否强制刷新缓存，默认false'),
	timeoutMs: z.number().int().positive().optional().describe('HTTP请求超时（毫秒），默认120000'),
};
