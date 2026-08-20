// The dark palette exists twice in app.css on purpose: once as
// [data-theme='dark'] (the stamped choice) and once under
// @media (prefers-color-scheme: dark) for a reader with scripts off, whom
// the pre-paint script cannot reach. Two copies of one palette is a drift
// hazard by construction — someone retunes a wash in one block and the
// no-JS page quietly stops matching the JS one — so the copies are held
// byte-identical here, declaration for declaration.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function declarations(block: string): string[] {
	return block
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.startsWith('--'))
		.sort();
}

describe('the dark palette and its no-JS twin', () => {
	it('carry exactly the same declarations', () => {
		const css = readFileSync('src/app.css', 'utf8');
		const stamped = /\[data-theme='dark'\] \{([^}]*)\}/.exec(css);
		const twin = /:root:not\(\[data-theme='light'\]\) \{([^}]*)\}/.exec(css);
		expect(stamped, "the [data-theme='dark'] block").toBeTruthy();
		expect(twin, 'the prefers-color-scheme twin').toBeTruthy();
		const a = declarations(stamped![1]);
		expect(a.length).toBeGreaterThan(5);
		expect(declarations(twin![1])).toEqual(a);
	});
});
