#!/usr/bin/env node

import { Command } from 'commander';
import { init } from './commands/init.js';
import { getPackageInfo } from './utils/get-package-info.js';

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

async function main() {
	const packageInfo = getPackageInfo();

	const program = new Command()
		.name('@melt-ui/cli')
		.description('Add MeltUI to your project')
		.version(packageInfo.version || '1.0.0', '-v, --version', 'display the version number');

	program.addCommand(init);

	program.parse();
}

main();
