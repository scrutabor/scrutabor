// The language and the page's own path, resolved once at prerender.
//
// Every page used to read these from `$app/state`, which is populated by
// SvelteKit's CLIENT ROUTER. That router cannot start without an origin,
// and `file://` has none — so a downloaded copy of this book could render
// but never come alive. The facts it was supplying are build-time facts:
// which language this page is, and where it sits. Passing them as data
// costs nothing and unties every page from the router.
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = ({ params, url }) => ({
	lang: params.lang,
	// the language-relative path, for the canonical and hreflang links;
	// a ?w= deep link canonicalizes to its page, so the query is dropped
	path: url.pathname.replace(/^\/(pl|en)/, '')
});
