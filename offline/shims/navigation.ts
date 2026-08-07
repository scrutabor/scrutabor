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

/** Shallow routing puts ?w=… in the address bar as words are tapped. From a
 * folder there is no address to put it in — `history.pushState` on a
 * file:// URL is refused — so the panel simply opens. The deep link still
 * WORKS as an entry point, which is the half that matters: a page opened at
 * ?w=w022 reads it on load. */
export function pushState() {}
export function replaceState() {}

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
