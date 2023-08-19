import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import type { PackageJson } from 'type-fest';

export function getPackageInfo(): PackageJson {
	const packageJsonPath = getPackageFilePath('../package.json');

	return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
}

function getPackageFilePath(filePath: string) {
	const distPath = fileURLToPath(new URL(`.`, import.meta.url));

	return path.resolve(distPath, filePath);
}
