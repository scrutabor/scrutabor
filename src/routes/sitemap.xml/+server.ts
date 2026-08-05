import { LEXICON, TEXTS } from '$lib/corpus';
import { CONCEPTS } from '$lib/grammar';
import { LANGS } from '$lib/i18n';
import { ORIGIN } from '$lib/site';

export const prerender = true;

// Every prerendered surface except the root (a pure redirect) and 404.
// Paths are language-relative; each gets one <url> per language carrying
// the full hreflang pair so crawlers bind the two variants together.
const surfaces: string[] = [
	'',
	'/editio',
	'/grammatica',
	'/grammatica/pronuntiatio',
	...Object.keys(TEXTS).map((key) => `/${key}`),
	...CONCEPTS.map((c) => `/grammatica/${c.id}`),
	...Object.keys(LEXICON.lemmata).map((lemma) => `/lemma/${lemma}`)
];

function urlEntry(lang: string, path: string): string {
	const alternates = LANGS.map(
		(l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${ORIGIN}/${l}${path}"/>`
	).join('');
	return (
		`<url><loc>${ORIGIN}/${lang}${path}</loc>${alternates}` +
		`<xhtml:link rel="alternate" hreflang="x-default" href="${ORIGIN}/en${path}"/></url>`
	);
}

export function GET(): Response {
	const body =
		'<?xml version="1.0" encoding="UTF-8"?>' +
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ' +
		'xmlns:xhtml="http://www.w3.org/1999/xhtml">' +
		surfaces.flatMap((path) => LANGS.map((lang) => urlEntry(lang, path))).join('') +
		'</urlset>';
	return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
}
