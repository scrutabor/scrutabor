/** Stable edition resources must reach the server even when an older
 * deployment left fresh immutable bytes in the browser's HTTP cache.
 * Current worker-cache entries still answer before this network-only step. */
export function revalidateResourceRequest(request: Request, origin: string): Request {
	const url = new URL(request.url);
	if (
		request.method !== 'GET' ||
		url.origin !== origin ||
		!/^\/artifacts\/(canon|proprium)\//.test(url.pathname)
	) {
		return request;
	}
	return new Request(request, {
		cache: 'no-cache',
		referrer: request.referrer,
		referrerPolicy: request.referrerPolicy
	});
}
