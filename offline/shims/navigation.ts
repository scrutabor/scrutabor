// What a book without a router does instead.
//
// Each of these is a deliberate answer, not a silence: the router is absent
// because every navigation here is a document load, so the hooks that exist
// to observe client-side navigation have nothing to observe.

/** There is no client-side navigation, so this fires once, on load — which
 * is the moment the callers care about (the reading ribbon restores the
 * reader's place). */
export function afterNavigate(fn: (nav?: unknown) => void) {
	if (typeof queueMicrotask === 'function') queueMicrotask(() => fn(undefined));
	else setTimeout(() => fn(undefined), 0);
}

export function beforeNavigate() {}

/** A real navigation, because that is what every link does here. */
export async function goto(url: string | URL) {
	location.href = String(url);
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
