// The word panel's behaviour, shared by every surface that shows Latin:
// the reading pages and the ordo flow. Tapping a word must do the same
// thing wherever the word is — the educational layer stays one tap away,
// which is the whole of the prayer-book-first rule (decisions #20), and
// the flow is not an exception to it.
//
// The caller supplies the lookup: an id here is whatever the surface uses
// to address one word. A reading page uses the corpus id (`w001`); the
// flow prefixes it with the text (`credo:w001`), because several texts
// share one page and their word ids collide.

import { untrack } from 'svelte';
import { pageUrl } from './url';
import { pushState, replaceState } from '$app/navigation';
import type { GlossDocument, TextDocument } from './corpus';

export interface WordPanelHost {
	/** Does this id address a word on this surface? */
	has: (id: string) => boolean;
}

/**
 * The panel wired to ONE document — the shape a reading page and the
 * landing's specimen share: the map of the document's words, the store
 * guarded by it, the URL's ?w= applied on arrival, and the selection
 * resolved to exactly what WordPanel renders. The ordo flow keeps its
 * own wiring: several texts share its page and its ids are prefixed.
 *
 * Call during component init — it owns runes; the getters stay live.
 */
export function docWordPanel(
	doc: () => TextDocument | undefined,
	gloss: () => GlossDocument | undefined
) {
	// Rebuilt whole by the derived whenever the document changes and never
	// mutated afterwards — the reactivity is the derived's, so the plain
	// Map needs none of SvelteMap's.
	const wordsById = $derived(
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		new Map((doc()?.segments ?? []).flatMap((s) => (s.words ?? []).map((w) => [w.id, w] as const)))
	);
	const panel = wordPanel({ has: (id) => wordsById.has(id) });

	$effect(() => {
		void wordsById;
		panel.applyFromLocation();
	});

	const word = $derived(panel.id ? (wordsById.get(panel.id) ?? null) : null);
	const wordGloss = $derived(panel.id ? (gloss()?.words[panel.id] ?? null) : null);
	const analysis = $derived.by(() => {
		const d = doc();
		if (!word || !d) return null;
		return word.analysis ?? d.analysis_defaults_words ?? d.analysis_defaults;
	});

	return {
		panel,
		get word() {
			return word;
		},
		get gloss() {
			return wordGloss;
		},
		get analysis() {
			return analysis;
		}
	};
}

export function wordPanel(host: WordPanelHost) {
	let selectedId = $state<string | null>(null);
	let keepPad = $state(false);

	// Bottom-sheet history model (one entry per panel session, the Material
	// convention): OPENING pushes a ?w= entry, so back closes it; SWITCHING
	// words replaces, so browsing ten words never costs ten back presses;
	// ×, outside-click, Esc and back all close through the same popped
	// entry. A panel opened by a deep link pushed nothing — back then
	// returns to the page the reader came from, and closing it merely
	// strips ?w= from the current entry.
	let openedByPush = false;

	function urlWith(id: string | null): URL {
		// A throwaway value handed straight to the router — never held in
		// state, so it needs none of SvelteURL's reactivity.
		const url = pageUrl();
		if (id) url.searchParams.set('w', id);
		else url.searchParams.delete('w');
		return url;
	}

	// Closing must not move the page: the router restores the scroll
	// position recorded when the panel's history entry was pushed (before
	// any tap-scroll shift), and dropping the sheet padding can clamp a
	// near-end position. Pin the current position across both.
	function preserveScroll() {
		const y = window.scrollY;
		const pad = window.innerHeight * 0.45;
		const maxAfter = document.documentElement.scrollHeight - pad - window.innerHeight;
		if (y > maxAfter) keepPad = true;
		const pin = () => window.scrollTo({ top: y, behavior: 'auto' });
		setTimeout(pin, 0);
		requestAnimationFrame(() => requestAnimationFrame(pin));
	}

	function open(id: string) {
		if (selectedId === null) {
			pushState(urlWith(id), {});
			openedByPush = true;
		} else {
			replaceState(urlWith(id), {});
		}
		selectedId = id;
	}

	function close() {
		preserveScroll();
		if (openedByPush) {
			openedByPush = false;
			history.back();
		} else {
			replaceState(urlWith(null), {});
		}
		selectedId = null;
	}

	// A tap must never bury the analysed word under its own panel: once the
	// sheet has rendered, scroll by exactly the overlap (plus a breathing
	// margin), so words already visible stay put.
	function raise(id: string) {
		requestAnimationFrame(() => {
			const el = document.getElementById(id);
			const sheet = document.querySelector('aside');
			if (!el || !sheet) return;
			const overlap = el.getBoundingClientRect().bottom + 16 - sheet.getBoundingClientRect().top;
			if (overlap <= 0) return;
			const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
			window.scrollBy({ top: overlap, behavior: reduced ? 'auto' : 'smooth' });
		});
	}

	// Navigations apply the URL's selection and scroll to it. The trigger is
	// the caller's effect on page.url (real navigations change it; shallow
	// push/replace do not, so taps cannot re-run this); the value comes from
	// location, because after a history traversal to a shallow-modified
	// entry page.url can lag behind the real URL.
	function applyFromLocation() {
		const w = pageUrl().searchParams.get('w');
		const target = w && host.has(w) ? w : null;
		// The browser's own back also just closes the panel — the page stays
		// where the reader is, not where they were when it opened. untrack:
		// reading selectedId plainly here would make the caller's navigation
		// effect depend on it, re-running on every tap (the documented
		// read-after-write regression class).
		if (!target && untrack(() => selectedId) !== null) preserveScroll();
		if (!target) openedByPush = false;
		selectedId = target;
		// The router resets scroll AFTER this runs on client-side
		// navigations — schedule the centering behind it, or deep links into
		// long texts land at the top.
		if (target) {
			requestAnimationFrame(() =>
				document.getElementById(target)?.scrollIntoView({ block: 'center' })
			);
		}
	}

	return {
		get id() {
			return selectedId;
		},
		/** Keeps the sheet's bottom padding while a close is being pinned. */
		get keepPad() {
			return keepPad;
		},
		open,
		close,
		raise,
		applyFromLocation,
		/** Tap on a word: toggles, and lifts it clear of the sheet. */
		toggle(id: string) {
			if (selectedId === id) close();
			else {
				open(id);
				raise(id);
			}
		},
		/** Follow a cross-reference: opens the target and centres it. */
		goTo(id: string) {
			open(id);
			document.getElementById(id)?.scrollIntoView({ block: 'center' });
			raise(id);
		}
	};
}
