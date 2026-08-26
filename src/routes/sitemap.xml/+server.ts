import { loadSenses, textKeysFor } from '$lib/corpus';
import { CONCEPTS } from '$lib/grammar';
import { LANGS, type Lang } from '$lib/i18n';
import { ORDO } from '$lib/ordo';
import { ORIGIN } from '$lib/site';

export const prerender = true;

const landing: string[] = ['', '/privacy', '/support'];
const sharedApp: string[] = [
	'',
	'/ordo',
	...ORDO.map((movement) => `/ordo/${movement.id}`),
	'/editio',
	'/bibliographia',
	'/grammatica',
	'/grammatica/pronuntiatio',
	...CONCEPTS.map((concept) => `/grammatica/${concept.id}`)
];

function urlEntry(base: string, language: Lang, path: string, available: Lang[]): string {
	const escaped = path.split('/').map(encodeURIComponent).join('/').replace(/&/g, '&amp;');
	const alternates = available
		.map(
			(candidate) =>
				`<xhtml:link rel="alternate" hreflang="${candidate}" href="${ORIGIN}${base}/${candidate}${escaped}"/>`
		)
		.join('');
	const fallback = available.includes('en') ? 'en' : available[0];
	return (
		`<url><loc>${ORIGIN}${base}/${language}${escaped}</loc>${alternates}` +
		`<xhtml:link rel="alternate" hreflang="x-default" href="${ORIGIN}${base}/${fallback}${escaped}"/></url>`
	);
}

export async function GET(): Promise<Response> {
	const appPaths = Object.fromEntries(
		await Promise.all(
			LANGS.map(async (language) => [
				language,
				new Set([
					...sharedApp,
					...textKeysFor(language).map((key) => `/${key}`),
					...Object.keys(await loadSenses(language)).map((lemma) => `/lemma/${lemma}`)
				])
			])
		)
	) as Record<Lang, Set<string>>;
	const allAppPaths = [...new Set(LANGS.flatMap((language) => [...appPaths[language]]))];
	const entries = [
		...landing.flatMap((path) => LANGS.map((language) => urlEntry('', language, path, LANGS))),
		...allAppPaths.flatMap((path) => {
			const available = LANGS.filter((language) => appPaths[language].has(path));
			return available.map((language) => urlEntry('/app', language, path, available));
		})
	];
	const body =
		'<?xml version="1.0" encoding="UTF-8"?>' +
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ' +
		'xmlns:xhtml="http://www.w3.org/1999/xhtml">' +
		entries.join('') +
		'</urlset>';
	return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
}
