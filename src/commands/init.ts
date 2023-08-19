import { existsSync } from 'fs';
import path from 'path';
import chalk from 'chalk';
import { Command } from 'commander';
import { execa } from 'execa';
import ora from 'ora';
import prompts from 'prompts';
import { getPackageManager } from '../utils/get-package-manager.js';
import { handleError } from '../utils/handle-error.js';
import { logger } from '../utils/logger.js';
import { installMeltPP, isMeltPPInstalled, parseSvelteConfig } from '../utils/add-pp.js';

const PROJECT_DEPENDENCIES = [
	'@melt-ui/svelte',
	'@melt-ui/pp',
	'svelte-sequential-preprocessor',
] as const;

const highlight = (text: string) => chalk.cyan(text);

export const init = new Command()
	.command('init')
	.description('Installs MeltUI in your SvelteKit project.')
	.option('-y, --yes', 'Skip confirmation prompt.')
	.option('-c, --cwd <cwd>', 'The working directory.', process.cwd())
	.action(async (options) => {
		const cwd = path.resolve(options.cwd);
		// Ensure target directory exists
		if (!existsSync(cwd)) {
			logger.error(`The path ${chalk.cyanBright(cwd)} does not exist. Please try again.`);
			process.exitCode = 1;
			return;
		}

		if (!options.yes) {
			const { proceed } = await prompts([
				{
					type: 'confirm',
					name: 'proceed',
					message: `Running this command will ${chalk.green(
						'install dependencies'
					)} and ${chalk.green('modify')} your existing ${highlight(
						'svelte.config.js'
					)} file. Proceed?`,
					initial: true,
				},
			]);

			if (!proceed) {
				process.exitCode = 0;
				return;
			}
		}

		try {
			// Get svelte config
			const svelteConfigPath = await promptForSvelteConfigPath();

			if (svelteConfigPath) {
				// Update config to install PP
				await updateSvelteConfig(svelteConfigPath);
			}

			await installDependencies(cwd, !!svelteConfigPath);

			logger.info('');
			logger.info(`${chalk.green('Success!')} MeltUI installation completed.`);
			logger.info('');
		} catch (e) {
			handleError(e);
		}
	});

async function promptForSvelteConfigPath(): Promise<string | undefined> {
	const { installPP } = await prompts([
		{
			type: 'confirm',
			name: 'installPP',
			message: `Would you like to install our ${highlight('preprocessor')}?`,
			initial: true,
		},
	]);

	if (installPP === false) return;

	const { svelteConfigPath } = await prompts([
		{
			type: 'text',
			name: 'svelteConfigPath',
			message: `Where is your ${highlight('svelte.config.js')} located?`,
			initial: 'svelte.config.js',
			validate: (value) => {
				if (existsSync(value)) {
					return true;
				}
				logger.info('');
				logger.error(`${chalk.cyanBright(value)} does not exist. Please enter a valid path.`);
				logger.info('');
				return false;
			},
		},
	]);

	logger.info('');

	return svelteConfigPath;
}

async function updateSvelteConfig(svelteConfigPath: string) {
	const configSpinner = ora(`Updating svelte.config.js...`).start();

	const parsedConfig = parseSvelteConfig(svelteConfigPath);
	const isAlreadyInstalled = await isMeltPPInstalled(parsedConfig);
	if (isAlreadyInstalled) {
		configSpinner.stop();
		logger.warn('MeltUI looks to be already installed!');
		process.exit(0);
	}

	await installMeltPP(parsedConfig);

	configSpinner.succeed();
}

async function installDependencies(cwd: string, noPP: boolean) {
	const dependenciesSpinner = ora(`Installing dependencies...`).start();
	const packageManager = await getPackageManager(cwd);

	const deps = noPP ? ['@melt-ui/svelte'] : PROJECT_DEPENDENCIES;

	await execa(packageManager, [packageManager === 'npm' ? 'install' : 'add', '-D', ...deps], {
		cwd,
	});
	dependenciesSpinner.succeed();
}
