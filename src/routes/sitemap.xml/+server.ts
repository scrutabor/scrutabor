import { LEXICON, TEXTS } from '$lib/corpus';
import { CONCEPTS } from '$lib/grammar';
import { LANGS } from '$lib/i18n';
import { ORDO } from '$lib/ordo';
import { ORIGIN } from '$lib/site';

export const prerender = true;

// Two families of surface, one origin. The landing pages live at the
// root; the book lives under /app. The two routers — / and /app/ — are
// pure redirects and are left out, as the root always was.
// Paths are language-relative; each gets one <url> per language carrying
// the full hreflang pair so crawlers bind the two variants together.
const landing: string[] = ['', '/privacy', '/support'];

const app: string[] = [
	'',
	'/ordo',
	...ORDO.map((m) => `/ordo/${m.id}`),
	'/editio',
	'/bibliographia',
	'/grammatica',
	'/grammatica/pronuntiatio',
	...Object.keys(TEXTS).map((key) => `/${key}`),
	...CONCEPTS.map((c) => `/grammatica/${c.id}`),
	...Object.keys(LEXICON.lemmata).map((lemma) => `/lemma/${lemma}`)
];

function urlEntry(base: string, lang: string, path: string): string {
	const alternates = LANGS.map(
		(l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${ORIGIN}${base}/${l}${path}"/>`
	).join('');
	return (
		`<url><loc>${ORIGIN}${base}/${lang}${path}</loc>${alternates}` +
		`<xhtml:link rel="alternate" hreflang="x-default" href="${ORIGIN}${base}/en${path}"/></url>`
	);
}

export function GET(): Response {
	const entries = [
		...landing.flatMap((path) => LANGS.map((lang) => urlEntry('', lang, path))),
		...app.flatMap((path) => LANGS.map((lang) => urlEntry('/app', lang, path)))
	];
	const body =
		'<?xml version="1.0" encoding="UTF-8"?>' +
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ' +
		'xmlns:xhtml="http://www.w3.org/1999/xhtml">' +
		entries.join('') +
		'</urlset>';
	return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
}
