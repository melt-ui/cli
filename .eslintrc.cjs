module.exports = {
	root: true,
	parser: '@typescript-eslint/parser',
	extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
	plugins: ['@typescript-eslint'],
	ignorePatterns: ['*.cjs', '*.js', 'dist/**/*'],
	overrides: [],
	env: {
		es2017: true,
		node: true,
	},
};
