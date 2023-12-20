import { logger } from './logger.js';

export function handleError(error: unknown): never {
	const PREFIX = 'ERROR:';
	logger.info('\n');

	if (typeof error === 'string') {
		logger.error(`${PREFIX} ${error}`);
		process.exit(1);
	}

	if (error instanceof Error) {
		logger.error(`${PREFIX} ${error.message}`);
		process.exit(1);
	}

	logger.error(`${PREFIX} Something went wrong. Please try again.`);
	process.exit(1);
}
