import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateOrdinarySegmentOmissions as descriptors } from './ordinary-omission-descriptors';
import { validateOrdinarySegmentOmissions as view } from './ordinary-segment-omissions';

// The neutral catalogue validates these prescriptions on every page. Any run-time import here
// would follow it into every page's graph: one such edge split the reading-address chunk and
// put a further file into the first visit's install shell.
const source = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf-8');

// The modules a source file loads at run time, each named as a path from this directory: the
// `$lib/` alias and a `.ts` or `.js` suffix name the same module, and a type-only import or
// export loads nothing.
const runtimeModules = (code: string) =>
	[
		...code.matchAll(
			/^[ \t]*(?:import|export)\s+(?!type\b)(?:[^;'"]*?\bfrom\s+)?['"]([^'"]+)['"]/gm
		)
	].map(([, specifier]) => specifier.replace(/^\$lib\//, './').replace(/\.(?:ts|js)$/, ''));

describe('the Ordinary omission descriptors', () => {
	it('are the validator the omission view re-exports', () => {
		expect(view).toBe(descriptors);
		expect(() => descriptors([])).not.toThrow();
		expect(() => descriptors([{ text: 'ordinarium/lavabo' }])).toThrow();
	});

	it('import nothing at run time', () => {
		expect(source('./ordinary-omission-descriptors.ts').match(/^import\b/gm)).toBeNull();
		expect(runtimeModules(source('./ordinary-omission-descriptors.ts'))).toEqual([]);
	});

	it('are what the catalogue and the omission presentation load', () => {
		for (const file of ['./corpus-metadata.ts', './ordinary-omission.ts']) {
			expect(runtimeModules(source(file))).toContain('./ordinary-omission-descriptors');
			expect(runtimeModules(source(file))).not.toContain('./ordinary-segment-omissions');
		}
	});

	it('read every way a module can be named or loaded', () => {
		expect(
			runtimeModules(
				[
					"import { a } from '$lib/ordinary-segment-omissions';",
					'import {\n\tb,\n\ttype C\n} from "./ordinary-segment-omissions.ts";',
					"export { d } from './reading-address.js';",
					"import './side-effect';",
					"import type { E } from './corpus';",
					"export type { F } from './corpus';",
					"export const g = 'from';"
				].join('\n')
			)
		).toEqual([
			'./ordinary-segment-omissions',
			'./ordinary-segment-omissions',
			'./reading-address',
			'./side-effect'
		]);
	});
});
