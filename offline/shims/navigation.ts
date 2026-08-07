// What a book without a router does instead.
//
// Each of these is a deliberate answer, not a silence: the router is absent
// because every navigation here is a document load, so the hooks that exist
// to observe client-side navigation have nothing to observe.

import { ORIGIN } from '$lib/site';

/** There is no client-side navigation, so this fires once, on load — which
 * is the moment the callers care about (the reading ribbon restores the
 * reader's place). */
export function afterNavigate(fn: (nav?: unknown) => void) {
	if (typeof queueMicrotask === 'function') queueMicrotask(() => fn(undefined));
	else setTimeout(() => fn(undefined), 0);
}

export function beforeNavigate() {}

/**
 * A site path as the file it is: /app/pl/ordinarium/confiteor becomes
 * ../../pl/ordinarium/confiteor.html, relative to whatever page is asking.
 *
 * The site serves the book under /app; in the folder, the app/ directory
 * IS that subtree, and `up` already climbs to it — so the prefix goes,
 * exactly as the build script drops it from the prerendered links.
 *
 * The depth is stamped into each page by the build, because a page cannot
 * work it out for itself — under file:// its own path is wherever the
 * reader happened to unzip the book.
 */
export function asFile(href: string): string {
	if (!href.startsWith('/')) return href;
	const up = (window as unknown as { __scrutabor_up?: string }).__scrutabor_up ?? './';
	// The .html belongs to the FILE, so it goes before any query or hash.
	const [, route = '', tail = ''] = /^([^?#]*)([?#].*)?$/.exec(href) ?? [];
	const stripped = route.replace(/^\/app(?=\/|$)/, '');
	// A path OUTSIDE /app names the site, not the book — the landing, the
	// colophon's way home. The folder carries only the book, so those
	// doors open the live site: "is there a new version" is a network
	// question, and the README already points there.
	if (stripped === route && !route.startsWith('/_')) return `${ORIGIN}${href}`;
	// The app's own front door is the package root's index.html.
	if (stripped === '' || stripped === '/') return `${up}../index.html${tail}`;
	const suffix = /\.[a-z0-9]+$/.test(stripped) ? '' : '.html';
	return up + stripped.slice(1) + suffix + tail;
}

/**
 * A real navigation, because that is what every link does here.
 *
 * It has to translate as well. The pager moves with the arrow keys and the
 * language menu switches through this, not through a link — so a `goto`
 * that took the path literally walked into the filesystem root, and only
 * those two paths through the book were broken.
 */
export async function goto(url: string | URL) {
	location.href = asFile(String(url));
}

/**
 * Shallow routing — the ?w= that appears as words are tapped.
 *
 * These were no-ops on the assumption that file:// refuses `pushState`. It
 * does not: pushing an entry, and setting a same-document query, both work
 * there. The assumption cost a real bug — the panel pushes an entry when it
 * opens and pops it when it closes, so a swallowed push meant every close
 * ran `history.back()` against whatever came before, and shutting the panel
 * navigated to the previous prayer.
 *
 * SvelteKit's signature is (url, state); the platform's is (state, title,
 * url).
 */
export function pushState(url: string | URL, state: unknown = {}) {
	history.pushState(state, '', url);
}

export function replaceState(url: string | URL, state: unknown = {}) {
	history.replaceState(state, '', url);
}

export function preloadData() {
	return Promise.resolve();
}
export function preloadCode() {
	return Promise.resolve();
}
export function invalidate() {
	return Promise.resolve();
}
export function invalidateAll() {
	return Promise.resolve();
}
export function onNavigate() {}
export function disableScrollHandling() {}
export function pushHistory() {}
