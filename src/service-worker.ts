/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

// Offline, in two stages — because the web and the installed app want
// opposite things (decisions #27, revised).
//
// A FIRST WEB VISIT should cost almost nothing: someone who opened one
// prayer has not asked to download a missal. So install precaches only the
// SHELL — the app's own code, the reading fonts, the catalog and the ordo
// map — and everything else is kept as the reader opens it.
//
// AN INSTALLED APP is the offline promise: it may be opened in a basement
// chapel with no signal, so when the browser reports an install (or the page
// asks in so many words) the worker fetches the whole book in the
// background. The native wrappers ship the same way.
import { build, files, prerendered, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE = `scrutabor-${version}`;

// Pages that ARE the shell: the app's language router, the two catalogs,
// the ordo map, the edition page. Everything else — texts, movements, the
// dictionary, the grammar — is a page a reader chooses. The landing pages
// outside /app/ are nobody's shell: this worker's scope never controls
// them, and they must not sit in the book's cache.
const SHELL_PAGE = /^\/app\/([a-z]{2}(\/(ordo|editio))?)?$/;

const SHELL = [...build, ...files, ...prerendered.filter((path) => SHELL_PAGE.test(path))];

/** The whole book, for a reader who installed it. Only the app subtree:
 * this also leaves out the sitemap and the landing pages, which live at
 * the origin root. */
const EVERYTHING = [...SHELL, ...prerendered.filter((path) => path.startsWith('/app/'))];

sw.addEventListener('install', (event) => {
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
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

async function fetchTheBook(): Promise<void> {
	const cache = await caches.open(CACHE);
	const missing = [];
	for (const path of EVERYTHING) {
		if (!(await cache.match(path, { ignoreSearch: true }))) missing.push(path);
	}
	// A few at a time: this runs while someone is reading, and a stampede of
	// a thousand requests would compete with the page in front of them.
	for (let i = 0; i < missing.length; i += 6) {
		await cache.addAll(missing.slice(i, i + 6)).catch(() => {
			/* one bad path must not abandon the rest */
		});
	}
}

// The browser tells the page, not the worker, so the page forwards it.
sw.addEventListener('message', (event) => {
	if (event.data === 'cache-the-book') event.waitUntil(fetchTheBook());
});

sw.addEventListener('fetch', (event) => {
	// A cache-first worker and a dev server want opposite things: the dev
	// server rewrites modules on every edit and the worker would keep
	// handing back the version it saw first. ($app/environment is not
	// available in a worker; Vite's own constant is.)
	if (import.meta.env.DEV) return;
	if (event.request.method !== 'GET') return;
	const url = new URL(event.request.url);
	if (url.origin !== sw.location.origin) return;
	event.respondWith(respond(event.request, url));
});

async function respond(request: Request, url: URL): Promise<Response> {
	const cache = await caches.open(CACHE);
	// A ?w= deep link is the same document as its page, so navigations
	// match without their query. Nothing else may: an asset URL that
	// differs only by query is a DIFFERENT file, and answering it from the
	// bare path hands back the wrong bytes entirely.
	const isPage = request.mode === 'navigate';
	const cached = await cache.match(request, { ignoreSearch: isPage });
	if (cached) return cached;

	try {
		const response = await fetch(request);
		// Keep what the reader actually opened, so the book fills in behind
		// them. Only real, own-origin answers: an error page cached is an
		// error page forever.
		if (response.ok && response.type === 'basic') {
			await cache.put(request, response.clone());
		}
		return response;
	} catch (err) {
		// Offline and never opened. Land the reader in the book rather than
		// on a browser error page.
		if (request.mode === 'navigate') {
			const lang = url.pathname.startsWith('/app/pl') ? '/app/pl' : '/app/en';
			const home = await cache.match(lang);
			if (home) return home;
		}
		throw err;
	}
}
