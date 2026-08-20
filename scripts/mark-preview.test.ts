// The dangerous direction is one-way: marking a preview costs nothing,
// marking PRODUCTION would quietly ask every search engine to drop the
// site. So the rule is tested from the production side first.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isPreview, markedHeaders } from './mark-preview.mjs';

describe('which deployments are marked noindex', () => {
	it('never the release branch', () => {
		expect(isPreview('release')).toBe(false);
	});

	it('nor a local build, which has no branch at all', () => {
		expect(isPreview(undefined)).toBe(false);
		expect(isPreview('')).toBe(false);
	});

	it('but yes staging', () => {
		expect(isPreview('staging')).toBe(true);
	});

	it('and yes anything else that somehow gets deployed', () => {
		// preview_branch_includes should keep this from happening; if it
		// ever does, the copy still says it is not the published edition
		expect(isPreview('main')).toBe(true);
		expect(isPreview('some-experiment')).toBe(true);
	});
});

describe('what marking writes', () => {
	it('appends the noindex rule and keeps every rule the build carried', () => {
		// Pages reads ONE _headers file. The first version of the writer
		// replaced it whole, so every staging deploy silently served the
		// site without its immutable-cache and HSTS rules — the halves of
		// static/_headers this asserts on by name.
		const committed = readFileSync('static/_headers', 'utf8');
		const marked = markedHeaders(committed);
		expect(marked).toContain('X-Robots-Tag: noindex, nofollow');
		expect(marked).toContain('max-age=31536000, immutable');
		expect(marked).toContain('Strict-Transport-Security');
	});

	it('still writes the rule when the build had no headers at all', () => {
		expect(markedHeaders('')).toContain('X-Robots-Tag: noindex, nofollow');
	});
});
