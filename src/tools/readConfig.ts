import fs from 'node:fs';
import path from 'node:path';

export interface ReadConfigOk {
	success: true;
	message: string;
	data: {
		config: Record<string, unknown>;
		configPath: string;
		projectPath: string;
	};
}

export interface ReadConfigFail {
	success: false;
	message: string;
	error: string;
}

async function findYApiConfig(projectPath?: string) {
	const searchPath = projectPath || process.cwd();
	const configFileName = 'yapi.config.json';

	let currentPath = path.resolve(searchPath);

	while (currentPath !== path.dirname(currentPath)) {
		const configFilePath = path.join(currentPath, configFileName);
		try {
			await fs.promises.access(configFilePath, fs.constants.F_OK);
			const configContent = await fs.promises.readFile(configFilePath, 'utf8');
			const config = JSON.parse(configContent) as Record<string, unknown>;

			if (!config.remoteUrl) {
				throw new Error('配置文件中缺少 remoteUrl 字段');
			}

			config.dataKey = config.dataKey || 'data';
			config.type = config.type || 'yapi';
			config.timeoutMs = typeof config.timeoutMs === 'number' ? config.timeoutMs : 120_000;

			return {
				config,
				configPath: configFilePath,
				projectPath: currentPath,
			};
		} catch (e: any) {
			if (e?.code !== 'ENOENT') {
				throw new Error(`读取配置文件失败: ${e?.message ?? String(e)}`);
			}
		}

		currentPath = path.dirname(currentPath);
	}

	throw new Error(`未找到 ${configFileName} 配置文件，请确保在项目根目录下创建该文件`);
}

export async function readConfig(params: { projectPath?: string }): Promise<ReadConfigOk | ReadConfigFail> {
	try {
		const result = await findYApiConfig(params.projectPath);
		return {
			success: true,
			message: '成功读取配置文件',
			data: {
				config: result.config,
				configPath: result.configPath,
				projectPath: result.projectPath,
			},
		};
	} catch (e: any) {
		return {
			success: false,
			message: `读取配置文件失败: ${e?.message ?? String(e)}`,
			error: e?.message ?? String(e),
		};
	}
}

