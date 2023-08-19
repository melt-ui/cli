import { logger } from './logger.js';

export function handleError(error: unknown) {
	if (typeof error === 'string') {
		logger.error(error);
		return (process.exitCode = 1);
	}

	if (error instanceof Error) {
		logger.error(error.message);
		return (process.exitCode = 1);
	}

	logger.error('Something went wrong. Please try again.');
	return (process.exitCode = 1);
}
