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
//
// AN UPDATE MUST NOT BURN THE BOOK. Activation used to delete every other
// cache on the spot — and the whole book with it, minutes or forever before
// a replacement existed. Now the old caches stay until the new one holds
// everything they held (each entry re-fetched at this version, or carried
// over byte-identical when content-addressed); only a completed migration
// deletes them, and until then the old copy still answers when the network
// cannot. Whether the reader asked for the whole book is REMEMBERED — in
// IndexedDB, across versions — never guessed from cache sizes.
import { build, files, prerendered, version } from '$service-worker';
import { cacheContainsAll } from '$lib/cache-completeness';

const sw = self as unknown as ServiceWorkerGlobalScope;

const PREFIX = 'scrutabor-';
const CACHE = `${PREFIX}${version}`;

// Pages that ARE the shell: the app's language router, the two catalogs,
// the ordo map, the edition page. Everything else — texts, movements, the
// dictionary, the grammar — is a page a reader chooses. The landing pages
// outside /app/ are nobody's shell: this worker's scope never controls
// them, and they must not sit in the book's cache.
const SHELL_PAGE = /^\/app\/([a-z]{2}(\/(ordo|editio))?)?$/;

// Vite gives independently loadable corpus JSON facades their own directory
// (vite.config.ts). They are build artifacts, but not shell: search and
// reading fetch only the candidates a reader asks for. An installed book
// still receives the complete set below.
const LAZY_CORPUS = build.filter((path) => path.includes('/immutable/corpus/'));
const SHELL_BUILD = build.filter((path) => !path.includes('/immutable/corpus/'));
const SHELL = [...SHELL_BUILD, ...files, ...prerendered.filter((path) => SHELL_PAGE.test(path))];

/** The day's own texts, one file per day per language (decisions #27,
 * revised 2026-08-18). These are NOT shell: a reader who opened one prayer
 * in a browser has not asked for the propers of the year, and the web
 * reader who never picks a date fetches none of them. They belong to the
 * book, so an installed app can open today's Mass in a basement chapel —
 * which is the promise that justified offline here at all. */
const DAYS = prerendered.filter((path) => path.startsWith('/artifacts/proprium/'));

/** The whole book, for a reader who installed it. Only the app subtree and
 * the day artifacts: this leaves out the sitemap and the landing pages,
 * which live at the origin root. */
const EVERYTHING = [
	...SHELL,
	...LAZY_CORPUS,
	...prerendered.filter((path) => path.startsWith('/app/')),
	...DAYS
];

/** What this edition can serve at all — the completion bar for a migration:
 * an old entry either exists here under the same path, or the edition no
 * longer carries it and nothing can be preserved. */
const EDITION = new Set([...build, ...files, ...prerendered]);

// ---------------------------------------------------------------------------
// Remembered intent. localStorage does not exist in a worker; this one flag
// must survive versions and sessions, so it lives in IndexedDB. Every read
// and write is wrapped: a browser in a locked-down mode answers "not
// requested", which only means the book refills lazily instead of eagerly.
const DB_NAME = 'scrutabor-sw';
const STORE = 'state';

function database(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, 1);
		request.onupgradeneeded = () => request.result.createObjectStore(STORE);
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

async function readFlag(key: string): Promise<unknown> {
	try {
		const db = await database();
		return await new Promise((resolve, reject) => {
			const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	} catch {
		return undefined;
	}
}

async function writeFlag(key: string, value: unknown): Promise<void> {
	try {
		const db = await database();
		await new Promise<void>((resolve, reject) => {
			const transaction = db.transaction(STORE, 'readwrite');
			transaction.objectStore(STORE).put(value, key);
			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);
		});
	} catch {
		// A browser that refuses storage still gets a working, lazier book.
	}
}

// ---------------------------------------------------------------------------

sw.addEventListener('install', (event) => {
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			await sw.clients.claim();
			// NOT a deletion. The superseded caches are the reader's book
			// until the new cache holds what they held.
			await migrate();
		})()
	);
});

async function previousCaches(): Promise<string[]> {
	return (await caches.keys()).filter((name) => name.startsWith(PREFIX) && name !== CACHE);
}

// One migration at a time; re-armed by activation, by every page load
// ('settle-caches'), and by the install signal — so an interrupted refill
// resumes the next time anything wakes the worker.
let migrating: Promise<void> | null = null;

function migrate(): Promise<void> {
	migrating ??= (async () => {
		try {
			const old = await previousCaches();
			if (!old.length) return;
			const cache = await caches.open(CACHE);

			// One pass over everything the reader held: content-addressed
			// assets carry over byte-identical — same hash, same bytes, no
			// network — and every addressed entry is noted for refetching
			// AT THIS version.
			const held = new Set<string>();
			for (const name of old) {
				const superseded = await caches.open(name);
				for (const request of await superseded.keys()) {
					const path = new URL(request.url).pathname;
					if (!EDITION.has(path)) continue;
					if (!path.includes('/immutable/')) {
						held.add(path);
						continue;
					}
					if (await cache.match(path)) continue;
					const response = await superseded.match(request);
					if (response) await cache.put(path, response);
				}
			}

			// A reader who asked for the whole book gets the whole book; a
			// partial browser cache refills exactly the pages it held —
			// partial stays partial.
			const bookRequested = Boolean(await readFlag('book-requested'));
			if (bookRequested) {
				await fetchTheBook();
			} else {
				await fetchAll([...held].filter((path) => !SHELL.includes(path)));
			}

			// Preserving the old entries is not enough for an installed book:
			// newly hashed chunks have no path in common with the old edition.
			// A failed fetch of one of them must therefore keep the old cache
			// available and let the next wake retry, instead of deleting the old
			// book behind an incomplete replacement.
			if (bookRequested && !(await cacheContainsAll(cache, EVERYTHING))) return;

			// Deletion happens ONLY behind a verified migration: every old
			// entry the edition still carries must now answer from the new
			// cache. A fetch that failed leaves the old cache in place, and
			// the next wake retries what is missing.
			for (const name of old) {
				const superseded = await caches.open(name);
				let complete = true;
				for (const request of await superseded.keys()) {
					const path = new URL(request.url).pathname;
					if (!EDITION.has(path)) continue;
					if (!(await cache.match(path, { ignoreSearch: true }))) {
						complete = false;
						break;
					}
				}
				if (complete) await caches.delete(name);
			}
		} finally {
			migrating = null;
		}
	})();
	return migrating;
}

// One run at a time: the install signal can arrive twice on a fresh install
// (the appinstalled event and the standalone check both fire), and two runs
// racing each other each computed `missing` before the other had filled
// anything — the whole book fetched twice.
let fetching: Promise<void> | null = null;

function fetchTheBook(): Promise<void> {
	fetching ??= (async () => {
		try {
			await fetchAll(EVERYTHING);
		} finally {
			// A later signal may retry what this run could not fetch.
			fetching = null;
		}
	})();
	return fetching;
}

async function fetchAll(paths: string[]): Promise<void> {
	const cache = await caches.open(CACHE);
	const missing = [];
	for (const path of paths) {
		if (!(await cache.match(path, { ignoreSearch: true }))) missing.push(path);
	}
	// A few at a time: this runs while someone is reading, and a
	// stampede of a thousand requests would compete with the page in
	// front of them. Each path fetched SINGLY — addAll is atomic, so
	// batching through it meant one bad path silently dropped the five
	// innocent files sharing its batch, and the book had quiet holes.
	for (let i = 0; i < missing.length; i += 6) {
		await Promise.allSettled(missing.slice(i, i + 6).map((path) => cache.add(path)));
	}
}

// The browser tells the page, not the worker, so the page forwards it.
sw.addEventListener('message', (event) => {
	if (event.data === 'cache-the-book') {
		event.waitUntil(
			(async () => {
				// The intent is REMEMBERED, so the next version's migration
				// keeps filling the book without being asked again.
				await writeFlag('book-requested', true);
				await migrate();
				await fetchTheBook();
			})()
		);
	}
	if (event.data === 'settle-caches') event.waitUntil(migrate());
	if (event.data === 'activate-release') event.waitUntil(sw.skipWaiting());
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

/** The offline navigation fallback's home, derived from the edition itself
 * rather than a hardcoded language pair: the path's own language if the
 * edition ships it, else English, else the first shipped language. */
const APP_LANGS = prerendered
	.map((path) => /^\/app\/([a-z]{2})$/.exec(path)?.[1])
	.filter((lang): lang is string => lang !== undefined);

function homeFor(pathname: string): string {
	const wanted = /^\/app\/([a-z]{2})(\/|$)/.exec(pathname)?.[1];
	const lang =
		wanted && APP_LANGS.includes(wanted) ? wanted : APP_LANGS.includes('en') ? 'en' : APP_LANGS[0];
	return `/app/${lang}`;
}

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
		} else if (!response.ok && url.pathname.includes('/immutable/')) {
			// A content-addressed asset the network no longer has: this copy
			// of the app is stale past recovering that file. Say so — the
			// page resurfaces the update notice with the reason — and let
			// the old caches below still answer if they can.
			const stale = await matchPrevious(request);
			if (stale) return stale;
			await notifyStaleAsset();
		}
		return response;
	} catch (err) {
		// Offline. The superseded caches still hold the reader's book while
		// a migration is underway — stale beats nothing in a basement
		// chapel — and a navigation nobody ever opened lands in the book.
		const stale = await matchPrevious(request, isPage);
		if (stale) return stale;
		if (isPage) {
			const home =
				(await cache.match(homeFor(url.pathname))) ??
				(await matchPrevious(new Request(homeFor(url.pathname)), true));
			if (home) return home;
		}
		throw err;
	}
}

async function matchPrevious(request: Request, isPage = false): Promise<Response | undefined> {
	for (const name of await previousCaches()) {
		const superseded = await caches.open(name);
		const found = await superseded.match(request, { ignoreSearch: isPage });
		if (found) return found;
	}
	return undefined;
}

async function notifyStaleAsset(): Promise<void> {
	for (const client of await sw.clients.matchAll({ type: 'window' })) {
		client.postMessage({ type: 'stale-asset' });
	}
}
