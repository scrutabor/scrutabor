import { describe, expect, it } from 'vitest';
import { appRoutePath, routePath } from './route-path';

describe('a route and its parameters name the page without the URL', () => {
	it('substitutes every kind of parameter segment', () => {
		expect(routePath('/app/[lang=lang]', { lang: 'pl' })).toBe('/app/pl');
		expect(
			routePath('/app/[lang=lang]/[category]/[slug]', {
				lang: 'pl',
				category: 'orationes',
				slug: 'ave-maria'
			})
		).toBe('/app/pl/orationes/ave-maria');
		expect(
			routePath('/app/[lang=lang]/formularium/[formulary]', {
				lang: 'en',
				formulary: 'dominica-i-adventus'
			})
		).toBe('/app/en/formularium/dominica-i-adventus');
		expect(routePath('/app/[lang=lang]/lemma', { lang: 'en' })).toBe('/app/en/lemma');
		expect(routePath('/docs/[...rest]', { rest: 'a/b' })).toBe('/docs/a/b');
		expect(routePath('/docs/[[optional]]', {})).toBe('/docs');
	});

	it('encodes a parameter the way the address bar would', () => {
		expect(routePath('/x/[slug]', { slug: 'a b/c' })).toBe('/x/a%20b/c');
	});

	it('hands the app layout the same language-relative path it read from the URL', () => {
		expect(
			appRoutePath('/app/[lang=lang]/ordo/[movement]', { lang: 'pl', movement: 'canon' })
		).toBe('/ordo/canon');
		expect(appRoutePath('/app/[lang=lang]', { lang: 'pl' })).toBe('');
	});
});
