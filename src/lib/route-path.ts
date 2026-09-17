// The page's own path, from its route and parameters alone.
//
// The app layout's server load used to read `url.pathname`. That made every
// page's data depend on the URL in the framework's eyes, so a history
// traversal between `?w=w008` and the bare page — a Back press after a
// reload, or after a phone restored a discarded tab — was a navigation that
// had to fetch the route's `__data.json` sidecar. The static host no longer
// serves those files (scripts/prune-route-data.mjs), and the reader was
// handed the 404 page in place of the prayer they were reading.
//
// A route id plus its parameters names the same path without touching the
// URL: `/app/[lang=lang]/[category]/[slug]` with `{ lang, category, slug }`
// is `/app/pl/orationes/ave-maria`. Nothing in it can change without a real
// navigation, so the router keeps the data it already has and only the
// page's own query handling runs — which is exactly what a shallow entry
// asks for.

const PARAM = /\[(?:\.\.\.)?([^\]=]+)(?:=[^\]]+)?\]/g;

/** The absolute path a route id and its parameters address. */
export function routePath(routeId: string, params: Record<string, string>): string {
	return (
		routeId
			// `[[optional]]` and `[...rest]` reduce to the same substitution: a
			// value that is absent contributes no segment.
			.replace(/\[\[([^\]]+)\]\]/g, '[$1]')
			.replace(PARAM, (_, name: string) =>
				(params[name] ?? '').split('/').map(encodeURIComponent).join('/')
			)
			.replace(/\/{2,}/g, '/')
			.replace(/(.)\/$/, '$1')
	);
}

/** The path below `/app/<lang>` — what the app layout hands every page. */
export function appRoutePath(routeId: string, params: Record<string, string>): string {
	return routePath(routeId, params).replace(`/app/${params.lang}`, '');
}
