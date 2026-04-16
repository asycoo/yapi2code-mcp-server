import { generateCode } from '../typeGenerator.js';
import type { InterfaceDetail } from '../types.js';

const DEFAULT_IMPORT = "import { request } from 'doraemon';";

export function runGenerateCode(detail: InterfaceDetail, importStatement?: string) {
	const stmt = importStatement?.trim() ? importStatement! : DEFAULT_IMPORT;
	return generateCode(detail, stmt);
}
