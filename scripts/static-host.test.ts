import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { fileFor, isWithheld, parseRedirects, redirectFor } from './static-host.ts';

describe('the static host resolves files as Cloudflare Pages does', () => {
	const root = mkdtempSync(join(tmpdir(), 'scrutabor-static-'));
	mkdirSync(join(root, 'app/pl/ordinarium'), { recursive: true });
	writeFileSync(join(root, 'app/pl/ordinarium/credo.html'), '<html>credo</html>');
	writeFileSync(join(root, 'app/pl.html'), '<html>pl</html>');
	mkdirSync(join(root, 'app'), { recursive: true });
	writeFileSync(join(root, 'app/index.html'), '<html>router</html>');
	writeFileSync(join(root, 'sitemap.xml'), '<urlset/>');
	writeFileSync(join(root, '_headers'), '/* X: y');
	afterAll(() => rmSync(root, { recursive: true, force: true }));

	it('serves exact files, then <path>.html, then <path>/index.html', () => {
		expect(fileFor(root, '/sitemap.xml')).toBe(join(root, 'sitemap.xml'));
		expect(fileFor(root, '/app/pl/ordinarium/credo')).toBe(
			join(root, 'app/pl/ordinarium/credo.html')
		);
		expect(fileFor(root, '/app/')).toBe(join(root, 'app/index.html'));
	});

	it('withholds its own configuration files, as Pages does', () => {
		for (const path of ['/_headers', '/_redirects', '/_routes.json', '/_worker.js']) {
			expect(isWithheld(path), path).toBe(true);
		}
		expect(isWithheld('/manifest.webmanifest')).toBe(false);
		// the file exists in the tree; the server must still answer 404
		expect(fileFor(root, '/_headers')).toBe(join(root, '_headers'));
	});

	it('answers nothing for a pruned sidecar, an unknown page or an escape', () => {
		expect(fileFor(root, '/app/pl/ordinarium/credo/__data.json')).toBeNull();
		expect(fileFor(root, '/app/pl/lemma/oro')).toBeNull();
		expect(fileFor(root, '/../etc/passwd')).toBeNull();
		expect(fileFor(root, '/%E0%A4%A')).toBeNull();
	});
});

describe('the static host honours _redirects', () => {
	const rules = parseRedirects(`
		# the dictionary moved to one shared page per language
		/app/:lang/lemma/:slug  /app/:lang/lemma?l=:slug  301
		/app/pl/proprium/dominica-i-adventus-introitus /app/pl/formularium/dominica-i-adventus#text-proprium-dominica-i-adventus-introitus 301 # trailing comment
		/old/*  /new/:splat
	`);

	it('substitutes placeholders and keeps the named status', () => {
		expect(redirectFor(rules, '/app/en/lemma/plenus')).toEqual({
			location: '/app/en/lemma?l=plenus',
			status: 301
		});
		// A fragment in the destination is part of the address, not a comment.
		expect(redirectFor(rules, '/app/pl/proprium/dominica-i-adventus-introitus')).toEqual({
			location:
				'/app/pl/formularium/dominica-i-adventus#text-proprium-dominica-i-adventus-introitus',
			status: 301
		});
	});

	it('expands a splat and defaults to a temporary redirect', () => {
		expect(redirectFor(rules, '/old/a/b')).toEqual({ location: '/new/a/b', status: 302 });
	});

	it('carries the request query to a destination without one, before its fragment', () => {
		expect(redirectFor(rules, '/old/a', '?x=1')).toEqual({ location: '/new/a?x=1', status: 302 });
		expect(
			redirectFor(rules, '/app/pl/proprium/dominica-i-adventus-introitus', '?w=w012')?.location
		).toBe(
			'/app/pl/formularium/dominica-i-adventus?w=w012#text-proprium-dominica-i-adventus-introitus'
		);
		// a destination with its own query keeps it
		expect(redirectFor(rules, '/app/pl/lemma/oro', '?stale=1')?.location).toBe(
			'/app/pl/lemma?l=oro'
		);
	});

	it('refuses a status the host would not accept', () => {
		expect(() => parseRedirects('/a /b 200')).toThrow(/unsupported status/);
	});

	it('leaves every other path to the file rules', () => {
		expect(redirectFor(rules, '/app/pl/lemma')).toBeNull();
		expect(redirectFor(rules, '/app/pl/ordinarium/credo')).toBeNull();
	});
});
