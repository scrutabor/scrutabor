/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

// Offline shell. A missal has to work in a church basement, on airplane
// mode, in a crypt with no signal — so the whole site is precached at
// install: the built app, the static files, and every prerendered page
// (the corpus is vendored into the bundle, so "every page" is the whole
// book). Roughly four megabytes, once per release.
//
// Cache-first, never revalidated: the cache is keyed by build version, a
// release installs a new one alongside, and it takes over when the last
// old tab closes. That is deliberately conservative — a page from build
// N references hashed assets from build N, and mixing generations is the
// one way a static site can serve a broken page.
import { build, files, prerendered, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE = `scrutabor-${version}`;
const PRECACHE = [...build, ...files, ...prerendered];

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
		return await fetch(request);
	} catch (err) {
		// Everything is precached, so a miss here means a path this build
		// never had. Offline, land the reader in the book rather than on a
		// browser error page.
		if (request.mode === 'navigate') {
			const lang = url.pathname.startsWith('/pl') ? '/pl' : '/en';
			const home = await cache.match(lang);
			if (home) return home;
		}
		throw err;
	}
}
