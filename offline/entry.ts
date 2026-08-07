/**
 * Starting a page without SvelteKit's router.
 *
 * SvelteKit's `start()` does two things at once: it hydrates the page, and
 * it takes over navigation. The second needs an origin — it builds URLs and
 * compares them — and `file://` has none, so `start()` throws before the
 * page ever comes alive. A book someone downloaded could render and never
 * respond to a tap.
 *
 * Only the first half is wanted. Every navigation in this book is a
 * document load anyway: a URL path is a file, exactly as on the site. So
 * this hydrates SvelteKit's own generated root component with the data
 * already sitting in the page, and no router is started at all.
 *
 * It reads SvelteKit's GENERATED manifest rather than a list of its own, so
 * a new route needs no change here.
 */
// `root` here is SvelteKit's own export: root.svelte wrapped in
// `asClassComponent`. Calling Svelte 5's `hydrate()` on the raw component
// instead looked equivalent and was not — it appended a fresh copy of
// everything in <svelte:head> beside the copy the build had already
// written, so every page carried two canonicals, two descriptions and six
// hreflangs. The wrapper is what claims them. SvelteKit constructs it
// exactly this way, and matching that is also what keeps this file from
// drifting away from the framework it borrows.
import { nodes, root } from '../.svelte-kit/generated/client/app.js';
import { asFile } from './shims/navigation';

type Payload = { type: string; data: Record<string, unknown> } | null;

/** The store shape root.svelte expects: subscribe/set, plus notify. */
function store<T>(value: T) {
	const subscribers = new Set<(v: T) => void>();
	return {
		subscribe(fn: (v: T) => void) {
			subscribers.add(fn);
			fn(value);
			return () => subscribers.delete(fn);
		},
		set(v: T) {
			value = v;
			subscribers.forEach((fn) => fn(value));
		},
		notify() {
			subscribers.forEach((fn) => fn(value));
		}
	};
}

export async function start(options: {
	node_ids: number[];
	data: Payload[];
	element: Element;
	params?: Record<string, string>;
}) {
	const { node_ids, data, element } = options;
	const modules = await Promise.all(node_ids.map((id) => nodes[id]()));

	// Each level sees its parent's data merged into its own, which is what
	// SvelteKit's own runtime hands a layout and then its page.
	const merged: Record<string, unknown>[] = [];
	let acc: Record<string, unknown> = {};
	for (const entry of data) {
		acc = { ...acc, ...(entry?.data ?? {}) };
		merged.push(acc);
	}

	// Params are derived from the data the routes now carry (see
	// [lang=lang]/+layout.server.ts) rather than parsed out of a URL that,
	// under file://, is a filesystem path.
	const params = options.params ?? {
		...(acc.lang ? { lang: acc.lang as string } : {}),
		...(acc.category ? { category: acc.category as string } : {}),
		...(acc.slug ? { slug: acc.slug as string } : {}),
		...(acc.movement ? { movement: acc.movement as string } : {}),
		...(acc.concept ? { concept: acc.concept as string } : {}),
		...(acc.lemma ? { lemma: acc.lemma as string } : {})
	};

	const page = {
		url: new URL('https://scrutabor.invalid/'),
		params,
		route: { id: null },
		status: 200,
		error: null,
		data: acc,
		form: null,
		state: {}
	};

	dedupeHead();
	new root({
		target: element as HTMLElement,
		hydrate: true,
		// asynchronous instantiation, as SvelteKit does it: no flushSync
		sync: false,
		props: {
			stores: { page: store(page), navigating: store(null), updated: store(false) },
			page,
			constructors: modules.map((m: { component: unknown }) => m.component),
			components: [],
			form: null,
			data_0: merged[0] ?? null,
			data_1: merged[1] ?? null,
			data_2: merged[2] ?? null
		}
	});
}

/**
 * The same shape SvelteKit's own `kit.start(app, element, options)` has, so
 * that preparing a page for offline reading is ONE substitution: the two
 * dynamic imports it awaits are replaced by this object. Everything else in
 * the page SvelteKit wrote — the node ids, the data, the call itself —
 * stands exactly as built.
 */
/**
 * The head, once the page is alive.
 *
 * Hydration adds a second copy of everything in `<svelte:head>` — canonical,
 * description, the three hreflangs — beside the copy the build wrote.
 * SvelteKit's own client does not, and matching it exactly was not worth
 * more of the framework's internals than this: nothing offline reads a
 * canonical link, so the duplicates are invisible to a reader and only
 * wrong on principle.
 *
 * Called BEFORE hydration, removing what the build wrote so that the live
 * copy — the one that stays correct if anything ever changes it — is the
 * only one left.
 */
function dedupeHead() {
	for (const selector of [
		'link[rel="canonical"]',
		'link[rel="alternate"]',
		'meta[name="description"]',
		'meta[property^="og:"]'
	]) {
		document.head.querySelectorAll(selector).forEach((node) => node.remove());
	}
}

/**
 * Links, once the page is alive.
 *
 * Rewriting the built HTML gets the links that were prerendered, and misses
 * every link a component renders when it hydrates — the pager writes
 * `href="/pl/orationes/ave-maria"` from its own template, and no
 * post-processing can reach it. So the runtime translates them at the
 * moment of the click: a root-absolute path becomes a path relative to this
 * page, with the `.html` the build already wrote.
 *
 * The depth is stamped into each page by the build script, because a page
 * cannot work it out for itself: under file:// its pathname is wherever the
 * reader happened to unzip the book.
 */
function interceptLinks() {
	addEventListener(
		'click',
		(event) => {
			if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return;
			const anchor = (event.target as Element | null)?.closest?.('a');
			const href = anchor?.getAttribute('href');
			if (!href || !href.startsWith('/')) return;
			event.preventDefault();
			location.href = asFile(href);
		},
		true
	);
}

const kit = {
	start(_app: unknown, element: Element, options: { node_ids: number[]; data: Payload[] }) {
		interceptLinks();
		return start({ ...options, element });
	}
};

declare global {
	interface Window {
		__scrutabor_kit?: typeof kit;
	}
}

window.__scrutabor_kit = kit;
