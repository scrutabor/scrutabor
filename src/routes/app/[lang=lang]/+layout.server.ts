// The language and the page's own path, resolved once at prerender.
//
// Every page used to read these from `$app/state`, which is populated by
// SvelteKit's CLIENT ROUTER. That router cannot start without an origin,
// and `file://` has none — so a downloaded copy of this book could render
// but never come alive. The facts it was supplying are build-time facts:
// which language this page is, and where it sits. Passing them as data
// costs nothing and unties every page from the router.
//
// A SERVER load, so the value is serialized into the page at prerender.
// A universal load would re-run in the browser, which means a page that
// cannot run loads — one opened from a folder — would not have it.
//
// From the ROUTE and its parameters, never from `url`: a load that reads the
// URL makes the framework refetch this route's data whenever the address
// changes, and a Back press across a shallow `?w=` entry is such a change.
// The static host serves no route data (scripts/prune-route-data.mjs), so
// that refetch was a 404 page over the prayer. See $lib/route-path.
import { appLayoutData } from '$lib/loaders';
import { appRoutePath } from '$lib/route-path';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ params, route }) =>
	// The edition for the catalog's colophon, and the language-relative path
	// for the canonical and hreflang links — a ?w= deep link canonicalizes to
	// its page, so the query is dropped.
	appLayoutData(params.lang, appRoutePath(route.id, params));
