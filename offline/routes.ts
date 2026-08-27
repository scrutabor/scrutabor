// The book's routes, and what each one needs — the table a downloaded copy
// navigates by.
//
// The site has one file per route and needs no router at all. A downloaded
// copy is ONE document: the route lives in the hash, and this says which
// SvelteKit route it is and what data that route's page gets.
import {
	bibliographyData,
	catalogData,
	conceptData,
	appLayoutData,
	lemmaData,
	ordoData,
	readingData
} from '$lib/loaders';
import { lemmaOfSlug } from '$lib/lemma-slug';
import type { Lang } from '$lib/i18n';
import { LANGS } from '$lib/i18n';

const LANGUAGE = `(${LANGS.map((language) => language.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`;
const route = (suffix: string) => new RegExp(`^/${LANGUAGE}${suffix}$`);

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
	{ name: 'home', key: '/app/[lang=lang]', pattern: route('/?'), params: ['lang'] },
	{
		name: 'search',
		key: '/app/[lang=lang]/search',
		pattern: route('/search/?'),
		params: ['lang']
	},
	{ name: 'ordo', key: '/app/[lang=lang]/ordo', pattern: route('/ordo/?'), params: ['lang'] },
	{
		name: 'movement',
		key: '/app/[lang=lang]/ordo/[movement]',
		pattern: route('/ordo/([^/]+)'),
		params: ['lang', 'movement']
	},
	{
		name: 'grammatica',
		key: '/app/[lang=lang]/grammatica',
		pattern: route('/grammatica/?'),
		params: ['lang']
	},
	{
		name: 'pronuntiatio',
		key: '/app/[lang=lang]/grammatica/pronuntiatio',
		pattern: route('/grammatica/pronuntiatio'),
		params: ['lang']
	},
	{
		name: 'concept',
		key: '/app/[lang=lang]/grammatica/[concept]',
		pattern: route('/grammatica/([^/]+)'),
		params: ['lang', 'concept']
	},
	{
		name: 'lemma',
		key: '/app/[lang=lang]/lemma/[lemma]',
		pattern: route('/lemma/([^/]+)'),
		params: ['lang', 'lemma']
	},
	{
		name: 'bibliographia',
		key: '/app/[lang=lang]/bibliographia',
		pattern: route('/bibliographia'),
		params: ['lang']
	},
	{
		name: 'editio',
		key: '/app/[lang=lang]/editio',
		pattern: route('/editio'),
		params: ['lang']
	},
	{
		name: 'reading',
		key: '/app/[lang=lang]/[category]/[slug]',
		pattern: route('/([^/]+)/([^/]+)'),
		params: ['lang', 'category', 'slug']
	}
];

export function match(path: string): RouteMatch | null {
	const clean = path.replace(/\.html$/, '');
	for (const route of ROUTES) {
		const found = route.pattern.exec(clean);
		if (!found) continue;
		const params: Record<string, string> = {};
		try {
			route.params.forEach((name, i) => (params[name] = decodeURIComponent(found[i + 1])));
		} catch {
			// %-garbage in a hash is not a route. Falling through lets the
			// copy show its own not-found instead of dying before boot on a
			// URIError — which rendered zero characters and no way back.
			continue;
		}
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
export async function pageData(found: RouteMatch): Promise<Record<string, unknown> | null> {
	const lang = found.params.lang as Lang;
	switch (found.name) {
		case 'home':
			return catalogData(lang);
		case 'reading':
			return await readingData(lang, found.params.category, found.params.slug);
		case 'movement':
			return await ordoData(lang, found.params.movement);
		case 'lemma': {
			const lemma = lemmaOfSlug(decodeURIComponent(found.params.lemma));
			return lemma ? await lemmaData(lang, lemma) : null;
		}
		case 'concept':
			return conceptData(found.params.concept);
		case 'bibliographia':
			return await bibliographyData(lang);
		default:
			return null;
	}
}

/** What the `[lang=lang]` layout returns on the site, computed here instead. */
export async function layoutFor(found: RouteMatch): Promise<Record<string, unknown>> {
	return appLayoutData(found.params.lang, found.path.replace(`/${found.params.lang}`, ''));
}
