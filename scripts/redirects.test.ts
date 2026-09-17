import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { textHref } from '../src/lib/content-url';
import { LANGS, type Lang } from '../src/lib/i18n';
import { parseRedirects, redirectFor } from './static-host.ts';

// The addresses the previous edition published keep answering. The rules
// are hand-listed — history is not derivable from the current data — so
// this holds each one to the page the app itself now names for that text.
const rules = parseRedirects(readFileSync('static/_redirects', 'utf8'));

describe('the published redirects', () => {
	it('send every old dictionary address to the shared page, keeping the entry', () => {
		const lemma = rules.find((rule) => rule.source === '/app/:lang/lemma/:slug');
		expect(lemma?.target).toBe('/app/:lang/lemma?l=:slug');
		expect(lemma?.status).toBe(301);
		// v0.10.0's one case-insensitive collision took numbered slugs; each
		// number names its authored form, before the general rule can catch it.
		for (const lang of LANGS) {
			expect(redirectFor(rules, `/app/${lang}/lemma/clemens.1`)?.location).toBe(
				`/app/${lang}/lemma?l=Clemens`
			);
			expect(redirectFor(rules, `/app/${lang}/lemma/clemens.2`)?.location).toBe(
				`/app/${lang}/lemma?l=clemens`
			);
			expect(redirectFor(rules, `/app/${lang}/lemma/oro`)?.location).toBe(
				`/app/${lang}/lemma?l=oro`
			);
		}
	});

	it('send every old Proper address to the formulary the app links it to', () => {
		const proper = rules.filter((rule) => rule.source.includes('/proprium/'));
		expect(proper.length, 'the forty Proper texts of v0.10.0 in both languages').toBe(80);
		for (const rule of proper) {
			const [, , lang, , slug] = rule.source.split('/');
			expect(LANGS).toContain(lang as Lang);
			expect(rule.target).toBe(textHref(lang as Lang, `proprium/${slug}`));
			expect(rule.status).toBe(301);
		}
	});

	it('stay within the host’s limits: at most 2,000 static and 100 dynamic rules', () => {
		// Pages counts as dynamic every rule from the first placeholder rule
		// onwards, whatever its shape — so the placeholder rule must be last,
		// or a hundred and first static line would be dropped in silence.
		const firstDynamic = rules.findIndex((rule) => /[:*]/.test(rule.source));
		const dynamic = firstDynamic < 0 ? 0 : rules.length - firstDynamic;
		expect(dynamic, 'only the closing placeholder rule is dynamic').toBe(1);
		expect(rules.length - dynamic).toBeLessThanOrEqual(2000);
	});
});
