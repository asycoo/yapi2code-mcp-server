import fs from 'node:fs';
import path from 'node:path';

function ensureDir(dir: string) {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function toFnNameLowerFirst(fnName: string) {
	return fnName;
}

export function toFnNameUpperFirst(fnName: string) {
	return fnName ? fnName.charAt(0).toUpperCase() + fnName.slice(1) : fnName;
}

export function writeGeneratedFile(params: {
	projectRoot: string;
	outputDir?: string;
	fnName: string;
	code: string;
}) {
	const relDir = params.outputDir?.trim() ? params.outputDir.trim() : 'src/yapi';
	const dirAbs = path.isAbsolute(relDir) ? relDir : path.join(params.projectRoot, relDir);
	ensureDir(dirAbs);

	// 文件名按 fnName（首字母不大写）
	const fileBase = `${toFnNameLowerFirst(params.fnName)}.ts`;
	const filePath = path.join(dirAbs, fileBase);
	fs.writeFileSync(filePath, params.code, 'utf8');
	return { filePath, dirAbs, fileName: fileBase };
}

