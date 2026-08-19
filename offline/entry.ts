/**
 * The book, running from data, in one document.
 *
 * The site prerenders every route: 2,381 files, each carrying its own copy of
 * the dictionary entries its words need. Downloaded, that came to 12.7 MB for
 * the Ordinary and one Sunday. This renders the same components from the same
 * corpus at 2 MB, and the whole church year projects to 12 MB — about what one
 * season costs today (notes/corpus-structure-2026-08-18.md §10-11).
 *
 * What `file://` refuses decides the shape, and it was measured rather than
 * assumed: `fetch()` of a sibling file is blocked outright, ES modules are
 * blocked by CORS against origin `null`, and a document has no path it can
 * trust — under file:// its own location is wherever the reader unzipped it.
 * A classic script works. So the runtime is one IIFE, the data rides inside
 * it, and the route lives in the HASH, which needs no server and no origin.
 *
 * SvelteKit's own client router is what cannot be used here: `start()`
 * hydrates AND takes over navigation, and the second half builds and compares
 * URLs, which throws before the page ever comes alive. What it does with the
 * route, though, is exactly what this does — read the component ids from the
 * generated manifest, run the loads, mount the pyramid — and it does it
 * against SvelteKit's own `dictionary`, so a route renamed in src/routes
 * fails here at boot rather than rendering the wrong page.
 */
import { dictionary, nodes, root } from '../.svelte-kit/generated/client/app.js';
import { LANGS, type Lang } from '$lib/i18n';
import { pageUrl } from '$lib/url';
import { layoutData } from '$lib/loaders';
import { layoutFor, match, pageData, type RouteMatch } from './routes';
import { asFile, go, navigated } from './shims/navigation';
import { page as pageState } from './shims/state';

type Component = { component: unknown };

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

/**
 * Which components a route mounts: the root layout, then its own layouts,
 * then its page — read from SvelteKit's generated manifest rather than from a
 * list kept here.
 *
 * The manifest encodes "this node has a server load" by negating the index
 * (`~12` is -13), which is a fact about where data comes from and not about
 * which component to mount, so it is undone.
 */
function nodeIds(key: string): number[] {
	const entry = dictionary[key as keyof typeof dictionary] as [number, number[]?] | undefined;
	if (!entry) throw new Error(`offline/routes.ts names ${key}, which SvelteKit does not have`);
	const [page, layouts = []] = entry;
	return [0, ...layouts, page < 0 ? ~page : page];
}

/** The language this reader last chose, else the one their browser asks for. */
function preferredLang(): Lang {
	try {
		const stored = localStorage.getItem('scrutabor-lang');
		if (stored && (LANGS as string[]).includes(stored)) return stored as Lang;
	} catch {
		/* a browser that refuses storage still gets a language */
	}
	for (const tag of navigator.languages ?? [navigator.language]) {
		const code = tag.slice(0, 2).toLowerCase();
		if ((LANGS as string[]).includes(code)) return code as Lang;
	}
	return 'en';
}

/** The route the hash names, with its query stripped — `?w=` and `?dies=`
 * change what a page shows, never which page it is. */
function routePath(): string {
	return (location.hash.slice(1) || '/').split('?')[0];
}

let instance: { $destroy: () => void } | null = null;
let mountedPath: string | null = null;
const stores = { page: store<unknown>(null), navigating: store(null), updated: store(false) };

/** Routes whose page cannot render without data the corpus may not have. */
const NEEDS_DATA = new Set(['reading', 'movement', 'lemma']);

/**
 * What to mount, and what to give it.
 *
 * A route the book does not have still renders inside the book: the root
 * layout, the app chrome and the language layout, with SvelteKit's own error
 * component (node 1) where the page would be. That is better than a bare
 * error page — the reader keeps the nav and the way back, and sees it in
 * their own language — and it also keeps the pyramid four deep, which matters
 * for the reason the next comment gives.
 */
function plan(found: RouteMatch | null, path: string) {
	const lang = /^\/(pl|en)\b/.exec(path)?.[1] as Lang | undefined;
	const data = found ? pageData(found) : null;
	const missing = !found || (data === null && NEEDS_DATA.has(found.name));
	if (!missing) return { ids: nodeIds(found!.key), layout: layoutFor(found!), data, ok: true };

	const inBook = nodeIds('/app/[lang=lang]');
	const ids = lang ? [...inBook.slice(0, -1), 1] : [0, 1];
	const layout = lang ? layoutData(lang, '') : null;
	return { ids, layout, data: null, ok: false };
}

/**
 * Every route's components, resolved once at boot.
 *
 * They are dynamic imports in SvelteKit's manifest and all of them are inside
 * this bundle already, so resolving them is a promise and not a download —
 * but a promise is enough to lose a race. Awaiting one inside the hashchange
 * handler left the address bar naming the new route while the old page was
 * still mounted and still listening, and an arrow key pressed in that gap
 * paged the book from the prayer the reader had already left.
 */
let loaded: Component[] = [];

function render(found: RouteMatch | null, path: string): void {
	const { ids, layout, data, ok } = plan(found, path);
	const constructors = ids.map((id) => loaded[id].component);

	const layers: (Record<string, unknown> | null)[] = ids.map(() => null);
	if (layout) layers[layers.length - 2] = layout;
	layers[layers.length - 1] = data;

	const merged: Record<string, unknown>[] = [];
	let acc: Record<string, unknown> = {};
	for (const layer of layers) {
		acc = { ...acc, ...(layer ?? {}) };
		merged.push(acc);
	}

	const page = {
		url: pageUrl(),
		params: ok ? (found?.params ?? {}) : {},
		route: { id: ok ? (found?.key ?? null) : null },
		status: ok ? 200 : 404,
		error: ok ? null : { message: 'not found' },
		data: acc,
		form: null,
		state: {}
	};
	// The `$app/state` shim is a plain object the error page reads at render.
	Object.assign(pageState, page);

	const props: Record<string, unknown> = {
		page,
		constructors,
		components: [],
		form: null,
		...Object.fromEntries(constructors.map((_, i) => [`data_${i}`, merged[i] ?? null]))
	};
	// The pyramid takes data_0…data_3; a stale one left set would hand a
	// deeper route's data to a shallower page.
	for (let i = constructors.length; i < 4; i++) props[`data_${i}`] = null;

	// A FRESH TREE every time, which is what the site gives: there each route
	// is its own document, so a page starts with no memory of the last one.
	// Updating in place — what SvelteKit's own client does, and the first
	// thing tried here — reuses a component whose constructor has not changed,
	// and two reading pages have the same constructor. The reader then carried
	// the previous prayer's open about-sheet into the next one, and the
	// keyboard pager moved two prayers on one press. It also broke outright
	// when the depth shrank, because Svelte sets the new props before it swaps
	// the components and a page one level deeper read the null meant for
	// nobody.
	//
	// Mounting again costs the layouts, which are the nav bar and two menus.
	// The page is the expensive part and is rebuilt either way.
	instance?.$destroy();
	stores.page.set(page);
	instance = new root({
		target: document.getElementById('scrutabor') as HTMLElement,
		// Nothing is prerendered here: the shell is an empty frame, so this
		// mounts rather than hydrates.
		hydrate: false,
		sync: false,
		props: { stores, ...props }
	}) as { $destroy: () => void };
	mountedPath = path;
}

function navigate(): void {
	const path = routePath();
	if (path === '/' || path === '') {
		location.replace(`#/${preferredLang()}`);
		return;
	}
	// A query-only change is the word panel opening or the day being picked.
	// Re-rendering there would throw away the page the reader is looking at.
	if (path === mountedPath) return;
	render(match(path), path);
	// A new page starts at its top, as a document load would.
	window.scrollTo({ top: 0, behavior: 'auto' });
	navigated();
}

/**
 * Links, once the page is alive.
 *
 * Components write site paths — the pager renders `/app/pl/orationes/ave-maria`
 * from its own template — and no post-processing of the built HTML can reach
 * those, because they are written at render. So the runtime translates at the
 * moment of the click.
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
			go(asFile(href));
		},
		true
	);
}

async function boot(): Promise<void> {
	loaded = (await Promise.all(nodes.map((load) => load()))) as Component[];
	interceptLinks();
	addEventListener('hashchange', () => navigate());
	navigate();
}

declare global {
	interface Window {
		__scrutabor_boot?: typeof boot;
	}
}

window.__scrutabor_boot = boot;
