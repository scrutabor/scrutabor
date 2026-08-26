// A file:// book is one IIFE with no second script to import. The same search
// implementation is present, while this boundary becomes an already-resolved
// promise so the component keeps one asynchronous contract in both editions.
import * as search from '$lib/search';

export function loadSearch() {
	return Promise.resolve(search);
}
