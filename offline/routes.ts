// The book's routes, and what each one needs — the table a downloaded copy
// navigates by.
//
// The site has one file per route and needs no router at all. A downloaded
// copy is ONE document: the route lives in the hash, and this says which
// SvelteKit route it is and what data that route's page gets.
import { bibliographyData, layoutData, lemmaData, ordoData, readingData } from '$lib/loaders';
import type { Lang } from '$lib/i18n';

export interface RouteMatch {
	name: string;
	key: string;
	params: Record<string, string>;
	path: string;
}

/**
 * In order: the specific before the general, since `/:lang/:category/:slug`
 * would otherwise swallow `/:lang/ordo/:movement` and every other three-part
 * address in the book.
 *
 * `key` is SvelteKit's own route id. The components a route mounts are read
 * from the generated client manifest under that key (see entry.ts), so no
 * node number is written down anywhere — a route that is renamed fails at
 * boot with the key that no longer exists, rather than rendering the wrong
 * page. scripts/offline-routes.test.ts holds the other direction: a route
 * added under src/routes/app and not listed here fails the build.
 */
export const ROUTES: { name: string; key: string; pattern: RegExp; params: string[] }[] = [
	{ name: 'home', key: '/app/[lang=lang]', pattern: /^\/(pl|en)\/?$/, params: ['lang'] },
	{ name: 'ordo', key: '/app/[lang=lang]/ordo', pattern: /^\/(pl|en)\/ordo\/?$/, params: ['lang'] },
	{
		name: 'movement',
		key: '/app/[lang=lang]/ordo/[movement]',
		pattern: /^\/(pl|en)\/ordo\/([^/]+)$/,
		params: ['lang', 'movement']
	},
	{
		name: 'grammatica',
		key: '/app/[lang=lang]/grammatica',
		pattern: /^\/(pl|en)\/grammatica\/?$/,
		params: ['lang']
	},
	{
		name: 'pronuntiatio',
		key: '/app/[lang=lang]/grammatica/pronuntiatio',
		pattern: /^\/(pl|en)\/grammatica\/pronuntiatio$/,
		params: ['lang']
	},
	{
		name: 'concept',
		key: '/app/[lang=lang]/grammatica/[concept]',
		pattern: /^\/(pl|en)\/grammatica\/([^/]+)$/,
		params: ['lang', 'concept']
	},
	{
		name: 'lemma',
		key: '/app/[lang=lang]/lemma/[lemma]',
		pattern: /^\/(pl|en)\/lemma\/([^/]+)$/,
		params: ['lang', 'lemma']
	},
	{
		name: 'bibliographia',
		key: '/app/[lang=lang]/bibliographia',
		pattern: /^\/(pl|en)\/bibliographia$/,
		params: ['lang']
	},
	{
		name: 'editio',
		key: '/app/[lang=lang]/editio',
		pattern: /^\/(pl|en)\/editio$/,
		params: ['lang']
	},
	{
		name: 'reading',
		key: '/app/[lang=lang]/[category]/[slug]',
		pattern: /^\/(pl|en)\/([^/]+)\/([^/]+)$/,
		params: ['lang', 'category', 'slug']
	}
];

export function match(path: string): RouteMatch | null {
	const clean = path.replace(/\.html$/, '');
	for (const route of ROUTES) {
		const found = route.pattern.exec(clean);
		if (!found) continue;
		const params: Record<string, string> = {};
		route.params.forEach((name, i) => (params[name] = decodeURIComponent(found[i + 1])));
		return { name: route.name, key: route.key, params, path: clean };
	}
	return null;
}

/**
 * The page's own data, or null for a page that needs none.
 *
 * These are the same functions the site's `+page.server.ts` files call at
 * prerender (see $lib/loaders), so the two editions cannot answer differently
 * — a page that would 404 on the site returns null here and the copy shows
 * its own not-found rather than an empty frame.
 */
export function pageData(found: RouteMatch): Record<string, unknown> | null {
	const lang = found.params.lang as Lang;
	switch (found.name) {
		case 'reading':
			return readingData(lang, found.params.category, found.params.slug);
		case 'movement':
			return ordoData(lang, found.params.movement);
		case 'lemma':
			return lemmaData(lang, found.params.lemma);
		case 'concept':
			return { concept: found.params.concept };
		case 'bibliographia':
			return bibliographyData(lang);
		default:
			return null;
	}
}

/** What the `[lang=lang]` layout returns on the site, computed here instead. */
export function layoutFor(found: RouteMatch): Record<string, unknown> {
	return layoutData(found.params.lang, found.path.replace(/^\/(pl|en)/, ''));
}
