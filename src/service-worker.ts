/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

// Offline shell. A missal has to work in a church basement, on airplane
// mode, in a crypt with no signal.
//
// WHAT IS PRECACHED AT INSTALL is the book you pray from: the app itself,
// the reading fonts, the catalog, the flow of the Mass, and every text.
// WHAT IS NOT is the book you study from: one page per lemma per language
// is already three fifths of this site and grows with the lexicon, not
// with the prayers — so those pages, and the grammar pages with them, are
// kept the first time they are opened. A reader who taps words keeps the
// words they tapped; a reader who only prays never pays for the
// dictionary.
//
// Cache-first, never revalidated, keyed by build version: a release
// installs its own cache alongside and takes over when the last old tab
// closes, so a page from build N never meets assets from build N+1.
import { build, files, prerendered, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE = `scrutabor-${version}`;

// EB Garamond ships every script it covers; two languages of Latin
// liturgy need none of these.
const UNUSED_SCRIPTS = /-(cyrillic|greek|vietnamese)(-ext)?-/;
// The study surfaces — kept on first visit instead (see above).
const ON_DEMAND = /\/(lemma|grammatica)\//;

const PRECACHE = [
	...build.filter((path) => !UNUSED_SCRIPTS.test(path)),
	...files,
	...prerendered.filter((path) => !ON_DEMAND.test(path) && !path.endsWith('/sitemap.xml'))
];

sw.addEventListener('install', (event) => {
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const key of await caches.keys()) {
				if (key !== CACHE) await caches.delete(key);
			}
		})()
	);
});

sw.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;
	const url = new URL(event.request.url);
	if (url.origin !== sw.location.origin) return;
	event.respondWith(respond(event.request, url));
});

async function respond(request: Request, url: URL): Promise<Response> {
	const cache = await caches.open(CACHE);
	// ignoreSearch: ?w= deep links are the same document as their page.
	const cached = await cache.match(request, { ignoreSearch: true });
	if (cached) return cached;

	try {
		const response = await fetch(request);
		// Keep what the reader actually opened, so the dictionary fills in
		// behind them. Only real, own-origin answers: an error page cached
		// is an error page forever.
		if (response.ok && response.type === 'basic') {
			await cache.put(request, response.clone());
		}
		return response;
	} catch (err) {
		// Offline and never opened. Land the reader in the book rather than
		// on a browser error page.
		if (request.mode === 'navigate') {
			const lang = url.pathname.startsWith('/pl') ? '/pl' : '/en';
			const home = await cache.match(lang);
			if (home) return home;
		}
		throw err;
	}
}
