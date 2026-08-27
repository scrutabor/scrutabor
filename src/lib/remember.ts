/** Memoize a promise — but never its failure.
 *
 * Every lazy corpus resource is cached by the promise, so concurrent readers
 * share one fetch. Caching a REJECTED promise turned one flaky request into
 * a resource that stayed dead for the whole session: the reader's natural
 * retry — the next keystroke, the next navigation — replayed the memoized
 * failure. Eviction on rejection is the whole point of this helper, and the
 * helper exists so the rule is written once and tested once.
 */
export function remember<K, V>(cache: Map<K, Promise<V>>, key: K, make: () => Promise<V>) {
	let pending = cache.get(key);
	if (!pending) {
		pending = make();
		pending.catch(() => cache.delete(key));
		cache.set(key, pending);
	}
	return pending;
}
