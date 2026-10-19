// The word panel's behaviour, shared by every surface that shows Latin:
// the reading pages and the ordo flow. Tapping a word must do the same
// thing wherever the word is — the educational layer stays one tap away,
// which is the whole of the prayer-book-first rule (decisions #20), and
// the flow is not an exception to it.
//
// The caller supplies the lookup: an id here is whatever the surface uses
// to address one word. A reading page uses the corpus id (`w001`); the
// flow prefixes it with the text (`credo.w001` — the dot is unreserved in
// a URL, TextBody records why), because several texts share one page and
// their word ids collide.

import { untrack } from 'svelte';
import { pageUrl } from './url';
import { pushState, replaceState } from '$app/navigation';
import type { Analysis, GlossDocument, TextDocument, Word, WordGloss } from './corpus';
import { constructionForWord, type WordConstruction } from './word-construction';
import { readingLocationFrame } from './reading-location';

export interface WordPanelSelection {
	gloss: WordGloss | null;
	analysis: Analysis;
	construction: WordConstruction | null;
}

/** Resolve the data every word panel needs from one selected corpus word. */
export function wordPanelSelection(
	word: Word,
	doc: TextDocument,
	gloss: GlossDocument
): WordPanelSelection {
	return {
		gloss: gloss.words[word.id] ?? null,
		analysis: word.analysis ?? doc.analysis_defaults_words ?? doc.analysis_defaults,
		construction: constructionForWord(doc, gloss, word.id)
	};
}

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
	let padMayRelax = false;
	// A deep link is still landing: content arriving may shift its word,
	// and until the reader acts the centering promise is ours to keep
	// (see applyFromLocation).
	let settling = false;
	// The URL word whose landing window `settling` describes. It is recorded
	// before the word exists, so a gesture while a delayed proper is still in
	// flight ends that same window instead of letting its arrival start a new
	// one. Taps update it themselves because shallow routing does not re-run
	// the location effect.
	let settlingWord: string | null = null;
	// Both landing frames belong to this panel, never the next page with
	// the same corpus word IDs. A newer position replaces pending work.
	const positionFrame = readingLocationFrame();
	$effect(() => positionFrame.cancel);

	// The pins preserveScroll schedules must not outlive the page: an
	// un-cancelled pin from a closing panel can fire against the NEXT
	// document if the reader navigates within a frame or two. Held here so
	// a newer pin cancels an older one, and torn down with the component.
	let pinTimer: ReturnType<typeof setTimeout> | null = null;
	let pinRaf = 0;
	function cancelPin() {
		popPin = null;
		if (pinTimer !== null) clearTimeout(pinTimer);
		pinTimer = null;
		if (pinRaf) cancelAnimationFrame(pinRaf);
		pinRaf = 0;
	}
	$effect(() => () => {
		cancelPin();
		cancelClosePop();
	});

	// The reader's first own gesture ends the settling window (see
	// applyFromLocation): these are exactly the inputs a programmatic
	// scrollIntoView cannot fire, so the two scroll promises never fight.
	$effect(() => {
		const acts = (event: Event) => {
			settling = false;
			positionFrame.cancel();
			// A close's own Escape must not release padding or cancel its pins.
			if (event?.type === 'keydown' && (event as KeyboardEvent).key === 'Escape') return;
			padMayRelax = true;
			cancelPin();
		};
		const kinds = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;
		for (const kind of kinds) window.addEventListener(kind, acts, { passive: true });
		return () => {
			for (const kind of kinds) window.removeEventListener(kind, acts);
		};
	});

	// The kept padding is needed only while the reader still sits in the
	// zone the sheet's padding made reachable; the moment they scroll back
	// above it, the page can give the space up without moving under them.
	$effect(() => {
		const relax = () => {
			// History restoration is not a reader scroll back out of this zone.
			if (!keepPad || !padMayRelax) return;
			const pad = window.innerHeight * 0.45;
			const maxAfter = document.documentElement.scrollHeight - pad - window.innerHeight;
			if (window.scrollY <= maxAfter) keepPad = false;
		};
		window.addEventListener('scroll', relax, { passive: true });
		return () => window.removeEventListener('scroll', relax);
	});

	// Bottom-sheet history model (one entry per panel session, the Material
	// convention): OPENING pushes a ?w= entry, so back closes it; SWITCHING
	// words replaces, so browsing ten words never costs ten back presses;
	// ×, outside-click, Esc and back all close through the same popped
	// entry. A panel opened by a deep link pushed nothing — back then
	// returns to the page the reader came from, and closing it merely
	// strips ?w= from the current entry.
	let openedByPush = false;
	// The current selection’s exact logical address without its word. A Forward
	// can restore that selection without proving this panel pushed its entry.
	let selectionBase: string | null = null;
	// What to do once a close's own pop has landed (see closeThen). One slot:
	// a second gesture before the pop replaces the first, so the last thing
	// the reader asked for is what the settled address shows.
	let afterPop: (() => void) | null = null;
	let popPin: (() => void) | null = null;
	let closePop: (() => void) | null = null;

	function cancelClosePop() {
		if (closePop !== null) removeEventListener('popstate', closePop);
		closePop = null;
		popPin = null;
		afterPop = null;
	}

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
	function preserveScroll(waitForPop = false) {
		padMayRelax = false;
		const y = window.scrollY;
		const pathname = pageUrl().pathname;
		const pad = window.innerHeight * 0.45;
		const maxAfter = document.documentElement.scrollHeight - pad - window.innerHeight;
		if (y > maxAfter) keepPad = true;
		const pin = () => {
			if (pageUrl().pathname === pathname) window.scrollTo({ top: y, behavior: 'auto' });
		};
		const schedule = () => {
			cancelPin();
			pinTimer = setTimeout(pin, 0);
			pinRaf = requestAnimationFrame(() => {
				// A native smooth-scroll step can still arrive after the close.
				// Correct it in this frame, before retaining the next-frame fallback.
				pin();
				pinRaf = requestAnimationFrame(pin);
			});
		};
		schedule();
		if (waitForPop) {
			// The traversal may arrive after both early pins. Its actual event,
			// not a longer timeout, completes this close at the original position.
			popPin = schedule;
			closePop = () => {
				const completePin = popPin;
				const action = afterPop;
				cancelClosePop();
				if (pageUrl().pathname !== pathname) return;
				completePin?.();
				// An ordinary close has no queued intent. Consume its re-armed
				// timer in this dispatch, after the router's shallow restoration,
				// while retaining the frame fallback and closeThen cancellation.
				if (completePin && action === null && pinTimer !== null) {
					clearTimeout(pinTimer);
					pinTimer = null;
					pin();
				}
				action?.();
			};
			addEventListener('popstate', closePop);
		}
	}

	function open(id: string) {
		cancelClosePop();
		positionFrame.cancel();
		cancelPin();
		// The sheet's own padding is back — the kept one has done its work.
		keepPad = false;
		settlingWord = id;
		settling = false;
		selectionBase = urlWith(null).href;
		if (selectedId === null) {
			pushState(urlWith(id), {});
			openedByPush = true;
		} else {
			replaceState(urlWith(id), {});
		}
		selectedId = id;
	}

	function close() {
		if (selectedId === null && !openedByPush) return;
		positionFrame.cancel();
		preserveScroll(openedByPush);
		settlingWord = null;
		settling = false;
		if (openedByPush) {
			openedByPush = false;
			history.back();
		} else {
			replaceState(urlWith(null), {});
		}
		selectedId = null;
		selectionBase = null;
	}

	// Capture a same-address word dismissal before the router restores scroll.
	// It may follow Forward or a deep link, not only our own push. Entry ownership
	// still controls explicit close(); here the exact selection address suffices.
	// Clear selection now so a deferred host refresh cannot resample restored Y.
	$effect(() => {
		const closeFromHistory = () => {
			const url = pageUrl();
			if (selectedId === null || url.searchParams.has('w')) return;
			if (url.href !== selectionBase) return;
			positionFrame.cancel();
			preserveScroll();
			openedByPush = false;
			selectionBase = null;
			settlingWord = null;
			settling = false;
			selectedId = null;
		};
		addEventListener('popstate', closeFromHistory, true);
		return () => removeEventListener('popstate', closeFromHistory, true);
	});

	// A member deep link still selects one indivisible construction. Measure
	// its whole reading surface, including the shared translation.
	function readingElement(id: string) {
		const el = document.getElementById(id);
		return el?.closest('.token-group') ?? el;
	}

	// A tap must never bury the analysed word under its own panel: once the
	// sheet has rendered, scroll by exactly the overlap (plus a breathing
	// margin), so words already visible stay put.
	function raise(id: string, landing = false) {
		positionFrame.schedule(() => {
			if (selectedId !== id || (landing && !settling)) return;
			const el = readingElement(id);
			const sheet = document.querySelector('aside.panel');
			if (!el || !sheet) return;
			const overlap = el.getBoundingClientRect().bottom + 16 - sheet.getBoundingClientRect().top;
			if (overlap <= 0) return;
			const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
			window.scrollBy({ top: overlap, behavior: landing || reduced ? 'auto' : 'smooth' });
		});
	}

	// Navigations apply the URL's selection and scroll to it. The trigger is
	// the caller's effect on page.url (real navigations change it; shallow
	// push/replace do not, so taps cannot re-run this); the value comes from
	// location, because after a history traversal to a shallow-modified
	// entry page.url can lag behind the real URL.
	function applyFromLocation() {
		const w = pageUrl().searchParams.get('w');
		if (w !== settlingWord) {
			settlingWord = w;
			settling = w !== null;
		}
		const target = w && host.has(w) ? w : null;
		// The browser's own back also just closes the panel — the page stays
		// where the reader is, not where they were when it opened. untrack:
		// reading selectedId plainly here would make the caller's navigation
		// effect depend on it, re-running on every tap (the documented
		// read-after-write regression class).
		const applied = untrack(() => selectedId);
		// A same-selection data refresh must keep an ordinary tap's pending
		// clearance. It does not start a new deep-link landing window.
		if (target !== applied) positionFrame.cancel();
		if (!target && applied !== null) preserveScroll();
		if (!w) {
			openedByPush = false;
			selectionBase = null;
			settling = false;
		}
		selectedId = target;
		selectionBase = target ? urlWith(null).href : null;
		// The router resets scroll AFTER this runs on client-side
		// navigations — schedule the centering behind it, or deep links into
		// long texts land at the top.
		//
		// TWO PROMISES share this scroll and the `settling` window is what
		// reconciles them. A deep link LANDS ON ITS WORD — and on a day
		// with a formulary the proper arrives after the first centering and
		// shifts the word out of view (found by the pinned-clock suite on
		// Advent I: the Introit injects above the Kyrie), so while the link
		// is still settling, every re-run re-centers. And a day's proper
		// arriving must NOT yank the page back to a word the reader opened,
		// read, and scrolled away from — so the reader's own first gesture
		// (wheel, touch, key, pointer — things a programmatic
		// scrollIntoView never fires) ends the settling window for good.
		if (target && settling) {
			positionFrame.schedule(() => {
				if (!settling || selectedId !== target) return;
				readingElement(target)?.scrollIntoView({ block: 'center' });
				raise(target, true);
			});
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
		/** Close, then act once the address has settled. A panel that pushed
		 * its own history entry closes by popping it, and anything written to
		 * the address before that pop lands on the entry about to vanish — a
		 * verse selected under an open panel used to be lost that way. The
		 * pop is awaited exactly when it happens, and never inferred from the
		 * address, which the downloaded edition keeps in the hash. */
		closeThen(action: () => void) {
			close();
			if (closePop !== null) {
				// The last requested action wins while the same close is pending.
				afterPop = action;
				return;
			}
			action();
		},
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
			readingElement(id)?.scrollIntoView({ block: 'center' });
			raise(id);
		}
	};
}
