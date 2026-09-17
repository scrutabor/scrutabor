import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fileFor, parseRedirects, redirectFor } from './static-host.ts';

describe('the static host resolves files as Cloudflare Pages does', () => {
	const root = mkdtempSync(join(tmpdir(), 'scrutabor-static-'));
	mkdirSync(join(root, 'app/pl/ordinarium'), { recursive: true });
	writeFileSync(join(root, 'app/pl/ordinarium/credo.html'), '<html>credo</html>');
	writeFileSync(join(root, 'app/pl.html'), '<html>pl</html>');
	mkdirSync(join(root, 'app'), { recursive: true });
	writeFileSync(join(root, 'app/index.html'), '<html>router</html>');
	writeFileSync(join(root, 'sitemap.xml'), '<urlset/>');

	it('serves exact files, then <path>.html, then <path>/index.html', () => {
		expect(fileFor(root, '/sitemap.xml')).toBe(join(root, 'sitemap.xml'));
		expect(fileFor(root, '/app/pl/ordinarium/credo')).toBe(
			join(root, 'app/pl/ordinarium/credo.html')
		);
		expect(fileFor(root, '/app/')).toBe(join(root, 'app/index.html'));
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
		/app/pl/proprium/dominica-i-adventus-introitus /app/pl/formularium/dominica-i-adventus#text-proprium-dominica-i-adventus-introitus 301
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

	it('leaves every other path to the file rules', () => {
		expect(redirectFor(rules, '/app/pl/lemma')).toBeNull();
		expect(redirectFor(rules, '/app/pl/ordinarium/credo')).toBeNull();
	});
});
