// What the service worker may promise, derived from the build's own lists.
//
// `$service-worker` reports every prerendered path SvelteKit produced,
// including the `__data.json` route sidecars. The hosted build deliberately
// removes those files (scripts/prune-route-data.mjs): the reader navigates
// by complete documents and never asks for them. A worker that still listed
// them would fetch 482 paths that answer 404, never see its book complete,
// and never delete a superseded cache. The lists are computed here, away
// from the worker's globals, so a test can hand in a manifest and read back
// exactly what the worker will precache, fill and preserve.

/** The framework's client-router sidecar, never served by the static host. */
export function isRouteDataSidecar(path: string): boolean {
	return path.endsWith('/__data.json');
}

// Pages that ARE the shell: the app's language router, the two catalogs,
// the ordo map, the edition page. Everything else — texts, movements, the
// dictionary, the grammar — is a page a reader chooses. The landing pages
// outside /app/ are nobody's shell: this worker's scope never controls
// them, and they must not sit in the book's cache.
const SHELL_PAGE = /^\/app\/([a-z]{2}(\/(ordo|editio))?)?$/;

export interface EditionManifest {
	build: readonly string[];
	files: readonly string[];
	prerendered: readonly string[];
}

export interface EditionLists {
	/** Precached on install: the app's own code, fonts and the shell pages. */
	shell: string[];
	/** Corpus JSON facades and indexes, fetched only when a reader needs them. */
	lazyCorpus: string[];
	/** The day packs: part of the book, never of a first visit. */
	days: string[];
	/** The whole book, for a reader who installed it. */
	everything: string[];
	/** What this edition can serve at all — the completion bar for a migration. */
	edition: Set<string>;
}

export function editionLists({ build, files, prerendered }: EditionManifest): EditionLists {
	// Only documents the host actually serves. The sidecars are pruned from
	// the emitted build, so they are neither a promise nor a migration goal.
	const pages = prerendered.filter((path) => !isRouteDataSidecar(path));

	// Vite gives independently loadable corpus JSON facades their own
	// directory (vite.config.ts). They are build artifacts, but not shell.
	const lazyCorpus = build.filter((path) => path.includes('/immutable/corpus/'));
	const shellBuild = build.filter((path) => !path.includes('/immutable/corpus/'));
	const shell = [...shellBuild, ...files, ...pages.filter((path) => SHELL_PAGE.test(path))];
	const days = pages.filter((path) => path.startsWith('/artifacts/proprium/'));
	const everything = [
		...shell,
		...lazyCorpus,
		...pages.filter((path) => path.startsWith('/app/')),
		...days
	];
	return {
		shell,
		lazyCorpus,
		days,
		everything,
		edition: new Set([...build, ...files, ...pages])
	};
}
