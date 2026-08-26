// The landing's language, resolved once at prerender — the same pattern
// as the app's own language layout, minus everything the reading surfaces
// need. The landing pages are plain web pages: they are never packaged
// for offline, and nothing here may grow app machinery.
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ params, url }) => ({
	lang: params.lang,
	// the language-relative path, for the canonical and hreflang links
	path: url.pathname.replace(`/${params.lang}`, '')
});
