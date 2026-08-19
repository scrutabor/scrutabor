// Where the reader is, in the app's own terms.
//
// On the site that is `location.href` and nothing else. A downloaded copy is
// one document — there are no per-route files to open — so the route lives in
// the hash, and `location.search` there is always empty while the query the
// page cares about (`?w=`, `?dies=`, `?v=`) sits after the hash instead.
//
// Reading `location.href` directly worked while both editions had real URLs
// and would silently return nothing in the copy, which is the quiet kind of
// failure: the word panel would open with no word, the day picker would
// forget the day named in a link someone was sent, and neither would say why.
// So every read of the page's query goes through here.

/** True in a downloaded copy, where the build stamps this into the shell. */
function offline(): boolean {
	return typeof window !== 'undefined' && '__scrutabor_up' in window;
}

/**
 * The logical URL: the one the app's routes are named by, whichever edition
 * is running. Offline it is synthesised from the hash against a host that
 * does not resolve, because nothing may ever fetch it — it exists to be
 * parsed, and `URL` needs a base.
 */
export function pageUrl(): URL {
	if (!offline()) return new URL(location.href);
	try {
		return new URL(location.hash.slice(1) || '/', 'https://scrutabor.invalid');
	} catch {
		// A mangled hash (#//, #/%…) is not a page, and must not take the
		// copy down before it boots. The root is the honest fallback.
		return new URL('/', 'https://scrutabor.invalid');
	}
}

/** The language a path speaks, read from its SEGMENTS.
 *
 * Not a substring test: `'/app/en/lemma/plenus'.includes('/pl')` is true, so
 * the error page answered Polish to English readers on every lemma beginning
 * pl- (plenus, plebs, placeat…). English is the default for paths that name
 * no language, matching the x-default the site declares. */
export function langOfPath(pathname: string): 'pl' | 'en' {
	const segments = pathname.split('/');
	if (segments.includes('en')) return 'en';
	if (segments.includes('pl')) return 'pl';
	return 'en';
}

/** The path and query of a logical URL, without the origin — what a link
 * carries and what the offline shims put after the `#`. */
export function routeOf(url: URL | string): string {
	const parsed = typeof url === 'string' ? new URL(url, 'https://scrutabor.invalid') : url;
	return parsed.pathname + parsed.search;
}
