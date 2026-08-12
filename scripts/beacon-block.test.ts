// What the offline package's cut must take, and what it must leave.
//
// The package's own canary only proves that no trace of the counter
// survived. A pattern that ate the pre-paint theme block on its way there
// would satisfy that canary and ship a book that opens without a theme, so
// the boundary is tested here instead.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BEACON_BLOCK, BEACON_HOST } from './beacon-block.mjs';

/** The two inline scripts as app.html really orders them: the theme block
 * that runs before first paint, then the counter. */
const APP_HTML = readFileSync('src/app.html', 'utf8');

describe('the offline package cuts the visit counter', () => {
	it('finds the block in the real app.html', () => {
		expect(APP_HTML).toContain(BEACON_HOST);
		expect(APP_HTML.replace(BEACON_BLOCK, '')).not.toContain(BEACON_HOST);
	});

	it('leaves the theme block whole', () => {
		// The theme block comes FIRST, which is exactly the trap: an untempered
		// pattern starts matching there and runs past its end.
		expect(APP_HTML.indexOf('scrutabor-theme')).toBeLessThan(APP_HTML.indexOf(BEACON_HOST));
		const cut = APP_HTML.replace(BEACON_BLOCK, '');
		expect(cut).toContain("localStorage.getItem('scrutabor-theme')");
		expect(cut).toContain('prefers-color-scheme: dark');
		expect(cut).toContain('%sveltekit.head%');
		expect(cut).toContain('%sveltekit.body%');
	});

	it('takes only the one block when several scripts surround it', () => {
		const html = ['<script>before();</script>', APP_HTML, '<script>after();</script>'].join('\n');
		const cut = html.replace(BEACON_BLOCK, '');
		expect(cut).toContain('before();');
		expect(cut).toContain('after();');
		expect(cut).not.toContain(BEACON_HOST);
	});

	it('does nothing to a page that never had one', () => {
		const html = '<head><script>theme();</script></head>';
		expect(html.replace(BEACON_BLOCK, '')).toBe(html);
	});
});

describe('the counter refuses everything but the site', () => {
	// The gates are inline in app.html and cannot be imported, so they are
	// read back as source. Each of these lines is load-bearing and a silent
	// deletion is exactly the regression worth catching.
	it('keeps every gate', () => {
		expect(APP_HTML).toContain("location.hostname !== 'scrutabor.org'");
		expect(APP_HTML).toContain("navigator.doNotTrack === '1'");
		expect(APP_HTML).toContain('navigator.globalPrivacyControl');
		expect(APP_HTML).toContain('navigator.onLine === false');
		expect(APP_HTML).toContain('%app.beacon%');
	});

	it('will not put a token of the wrong shape into the page', () => {
		// Lift the shape check out of app.html and hold it to its job: the
		// token is interpolated into an attribute, so anything that could
		// close one has to be refused before it gets there.
		const source = /if \(!(\/.+?\/i)\.test\(token\)\) return;/.exec(APP_HTML)?.[1];
		expect(source).toBeDefined();
		const shape = new RegExp(source!.slice(1, -2), 'i');

		expect(shape.test('a'.repeat(32))).toBe(true);
		expect(shape.test('0f8b21c4d9e7a6b5c4d3e2f10a9b8c7d')).toBe(true);
		expect(shape.test('')).toBe(false);
		expect(shape.test('short')).toBe(false);
		expect(shape.test('"}</script><script>alert(1)</script>')).toBe(false);
		expect(shape.test(`${'a'.repeat(32)}"`)).toBe(false);
		expect(shape.test('%app.beacon%')).toBe(false);
	});
});
