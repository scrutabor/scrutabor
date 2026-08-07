import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';

export default ts.config(
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node }
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts'],
		languageOptions: { parserOptions: { parser: ts.parser } }
	},
	{
		rules: {
			// The site deploys at the domain root (static adapter; the future
			// Capacitor wrapper serves from its own scheme root), so there is
			// no base path for resolve() to resolve. Revisit if paths.base is
			// ever configured.
			'svelte/no-navigation-without-resolve': 'off',
			// String-literal mustaches ({' '}, {', '}) are used exclusively as
			// explicit whitespace control in the whitespace-sensitive
			// interlinear markup, where a literal space would be subject to
			// Svelte's whitespace collapsing.
			'svelte/no-useless-mustaches': 'off'
		}
	},
	{
		ignores: [
			'build/',
			'build-offline-runtime/',
			'.svelte-kit/',
			'src/lib/data/',
			'test-results/',
			'playwright-report/'
		]
	}
);
