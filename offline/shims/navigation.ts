// What a book without SvelteKit's router does instead.
//
// Each of these is a deliberate answer, not a silence. The copy HAS a router
// (offline/entry.ts) — what it does not have is an origin, so every address
// lives in the hash and every one of these has to translate.

import { ORIGIN } from '$lib/site';
import { routeOf } from '$lib/url';

const listeners = new Set<(nav?: unknown) => void>();
let arrived = false;

/** Called by the router once a route has rendered. */
export function navigated() {
	arrived = true;
	listeners.forEach((fn) => fn(undefined));
}

/** Fires after each navigation, and immediately for a caller that registers
 * after the first one has already happened — the reading ribbon restores the
 * reader's place, and a ribbon mounted by the route that just rendered would
 * otherwise wait for a navigation that has been and gone. */
export function afterNavigate(fn: (nav?: unknown) => void) {
	listeners.add(fn);
	if (arrived) queueMicrotask(() => fn(undefined));
}

export function beforeNavigate() {}

/**
 * A site path as this copy's own address.
 *
 * The site serves the book under /app and each route is a file. Here the whole
 * book is one document and the route is its hash, so /app/pl/ordinarium/credo
 * becomes #/pl/ordinarium/credo — a same-document link, which needs no origin
 * and survives being opened from any folder.
 */
export function asFile(href: string): string {
	if (!href.startsWith('/')) return href;
	const [, route = '', tail = ''] = /^([^?#]*)([?#].*)?$/.exec(href) ?? [];
	const stripped = route.replace(/^\/app(?=\/|$)/, '');
	// A path OUTSIDE /app names the site, not the book — the landing, the
	// colophon's way home. The folder carries only the book, so those doors
	// open the live site: "is there a new version" is a network question, and
	// the README already points there.
	if (stripped === route && !route.startsWith('/_')) return `${ORIGIN}${href}`;
	// The app's own front door picks a language and gets out of the way. Here
	// the router does that for the empty route, so it is the empty route.
	if (stripped === '' || stripped === '/') return `#/${tail.replace(/^\?/, '')}`;
	return `#${stripped}${tail}`;
}

/**
 * A real navigation, because that is what every link does here.
 *
 * The pager moves with the arrow keys and the language menu switches through
 * this rather than through a link, so a `goto` that took the path literally
 * walked into the filesystem root — and only those two paths through the book
 * were broken by it.
 */
export async function goto(url: string | URL) {
	const target = asFile(String(url));
	// Assigning an unchanged hash fires no event, and a reader who asks for
	// the page they are on should not be met with nothing at all.
	if (target === location.hash) return;
	location.href = target;
}

/**
 * Shallow routing — the ?w= that appears as words are tapped, and the ?dies=
 * that names the day.
 *
 * These were no-ops once, on the assumption that file:// refuses `pushState`.
 * It does not, and the assumption cost a real bug: the panel pushes an entry
 * when it opens and pops it when it closes, so a swallowed push meant every
 * close ran `history.back()` against whatever came before, and shutting the
 * panel navigated to the previous prayer.
 *
 * The URL handed in is the LOGICAL one (see $lib/url) — `/pl/x?w=w012` — and
 * the address it has to become is that same route inside the hash. Pushing a
 * hash this way fires no `hashchange`, which is exactly right: the route has
 * not changed and the page must not be re-rendered under the reader.
 */
export function pushState(url: string | URL, state: unknown = {}) {
	history.pushState(state, '', `#${routeOf(url)}`);
}

export function replaceState(url: string | URL, state: unknown = {}) {
	history.replaceState(state, '', `#${routeOf(url)}`);
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
