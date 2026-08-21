/**
 * Arrow keys page through the book. Both reading surfaces want this — the
 * individual prayers had it and the Ordo did not, which is backwards: the
 * Ordo is where a reader is walking the Mass and most wants the next
 * movement without reaching for the pager (owner, 2026-08-09).
 *
 * A copy each would drift, as the two pagers did before Pager.svelte, so
 * the rules live here once: which keys, which modifiers are refused, and
 * which elements own the arrows instead.
 */
export function arrowNav(hrefFor: (dir: 'prev' | 'next') => string | undefined) {
	return (e: KeyboardEvent) => {
		if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
		// A BARE arrow key, and only that. Cmd+← is Back on a Mac and Alt+←
		// is Back everywhere else, and this was swallowing both: the reader
		// pressed Back and went to the next prayer instead (owner,
		// 2026-08-07). Every modifier is refused rather than the two that
		// are known to mean something, because a shortcut this page has
		// never heard of still belongs to the browser and not to it.
		if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
		const el = document.activeElement as HTMLElement | null;
		const tag = el?.tagName;
		if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
		// The reading-mode control and the role picker are radio groups: the arrows
		// move between their options and belong to them while they hold
		// focus.
		//
		// role, NOT tagName. This refused every BUTTON when it was written,
		// which reads as a safe superset of the radios and is not one:
		// EVERY WORD IN THE BOOK IS A BUTTON. Tapping a word to read its
		// analysis therefore switched the arrow keys off, and the reader
		// who paged through the Mass one prayer at a time lost the keys the
		// moment they looked something up (owner, 2026-08-09). A radio
		// group says what it is; a button says nothing about who owns the
		// arrows.
		if (el?.getAttribute('role') === 'radio') return;
		const href = hrefFor(e.key === 'ArrowLeft' ? 'prev' : 'next');
		return href;
	};
}
