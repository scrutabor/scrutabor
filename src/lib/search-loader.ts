// The hosted book keeps its indexes out of the first page. The downloaded
// book is one self-contained classic script and replaces this boundary with a
// static loader in offline/shims/search-loader.ts.
export function loadSearch() {
	return import('$lib/search');
}
