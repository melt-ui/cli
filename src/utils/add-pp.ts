import fs from 'fs';
import { walk } from 'estree-walker';
import { attachComments } from '../astravel/index.js';
import { type Comment, parse } from 'acorn';
import type { CallExpression, ImportDeclaration } from 'estree';
import type { Node } from 'estree-walker';
import prettier from 'prettier';
import { generate } from 'astring';

type ParsedSvelteConfig = ReturnType<typeof parseSvelteConfig>;

export function parseSvelteConfig(configPath: string) {
	const svelteConfig = fs.readFileSync(configPath, 'utf8');

	const comments: Comment[] = [];
	const ast = parse(svelteConfig, {
		ecmaVersion: 'latest',
		sourceType: 'module',
		onComment: comments,
	});

	return { ast, comments, configPath };
}

export async function installMeltPP(config: ParsedSvelteConfig) {
	const { ast, comments, configPath } = config;

	// @ts-expect-error body is always there
	ast.body.unshift(...createPPImports());

	const updatedSvelteConfig = walk(ast as Node, {
		enter(node) {
			if (node.type !== 'Property') return;

			// preprocess: []
			const isIdentifier = node.key.type === 'Identifier' && node.key.name === 'preprocess';

			// "preprocess": []
			const isLiteral = node.key.type === 'Literal' && node.key.value === 'preprocess';

			if (!isIdentifier && !isLiteral) return;

			const ppCallExpression: CallExpression = {
				type: 'CallExpression',
				callee: { type: 'Identifier', name: 'preprocessMeltUI' },
				arguments: [],
				optional: false,
			};

			const value = node.value;
			// take the elements and move it to the sequence
			if (value.type === 'ArrayExpression') {
				const elements = value.elements;

				// add the melt pp to the end of the array
				elements.push(ppCallExpression);

				// move the array into the args of `sequence`
				node.value = {
					type: 'CallExpression',
					callee: { type: 'Identifier', name: 'sequence' },
					arguments: [value],
					optional: false,
				};
			} else {
				// take the whole value and slap it into the array expression of sequence
				node.value = {
					type: 'CallExpression',
					callee: { type: 'Identifier', name: 'sequence' },
					arguments: [
						{
							type: 'ArrayExpression',
							elements: [
								// @ts-expect-error kinda just chucking it in here
								value,
								ppCallExpression,
							],
						},
					],
					optional: false,
				};
			}
		},
	});

	if (!updatedSvelteConfig) {
		throw new Error('Could not update svelte.config.js');
	}

	attachComments(updatedSvelteConfig, comments);
	const updatedSvelteConfigString = generate(updatedSvelteConfig, {
		comments: true,
	});

	return formatFile(updatedSvelteConfigString, configPath);
}

// checks for the import statement of the PP
export async function isMeltPPInstalled(config: ParsedSvelteConfig) {
	let isInstalled = false;
	const { ast } = config;

	walk(ast as Node, {
		enter(node) {
			if (node.type === 'ImportDeclaration') {
				if (node.source.value === '@melt-ui/pp') {
					isInstalled = true;
				}
			}
		},
	});

	return isInstalled;
}

async function formatFile(content: string, filePath: string): Promise<void> {
	const prettierConfigFilePath = await prettier.resolveConfigFile(filePath);
	if (!prettierConfigFilePath) {
		return fs.writeFileSync(filePath, content);
	}

	const prettierConfig = await prettier.resolveConfig(prettierConfigFilePath);
	if (!prettierConfig) {
		return fs.writeFileSync(filePath, content);
	}

	const formattedContent = await prettier.format(content, {
		...prettierConfig,
		parser: 'babel',
	});
	return fs.writeFileSync(filePath, formattedContent);
}

function createPPImports(): Array<ImportDeclaration> {
	return [
		{
			type: 'ImportDeclaration',
			specifiers: [
				{
					type: 'ImportSpecifier',
					imported: {
						type: 'Identifier',
						name: 'preprocessMeltUI',
					},
					local: {
						type: 'Identifier',
						name: 'preprocessMeltUI',
					},
				},
			],
			source: {
				type: 'Literal',
				value: '@melt-ui/pp',
			},
		},
		{
			type: 'ImportDeclaration',
			specifiers: [
				{
					type: 'ImportDefaultSpecifier',
					local: {
						type: 'Identifier',
						name: 'sequence',
					},
				},
			],
			source: {
				type: 'Literal',
				value: 'svelte-sequential-preprocessor',
			},
		},
	];
}
