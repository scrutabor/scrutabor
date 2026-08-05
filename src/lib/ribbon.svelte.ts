// Reading-position memory — the book's ribbon. Every long reading surface
// reopens where the reader left it: the per-text pages and the ordo flow,
// which is the longest of them and the one a reader in a pew most needs to
// come back to.
//
// Call once during component init with a key that names the surface.
// Positions are stored per surface, not per language, so switching
// languages resumes in place, and expire after twelve hours: a return
// mid-Mass resumes, next Sunday opens at the top.

const TTL = 12 * 60 * 60 * 1000;

// A physical ribbon does not move because the book was closed: this one
// tracks the last position the reader DWELLED at. Transient scrolls — up
// to the nav chrome on the way out, or the router's own resets — never
// live long enough to commit; a position near the top held for a moment
// means the reader rewound, and drops the ribbon.
const DWELL = 1200;
const FLOOR = 200;

function read(key: string): number | null {
	try {
		const raw = localStorage.getItem(key);
		if (!raw) return null;
		const { y, t } = JSON.parse(raw);
		if (typeof y !== 'number' || typeof t !== 'number') return null;
		return Date.now() - t > TTL ? null : y;
	} catch {
		// a malformed entry is as good as none
		return null;
	}
}

export function ribbon(key: () => string, skip: () => boolean = () => false) {
	$effect(() => {
		const k = key();
		let timer = 0;
		const onScroll = () => {
			clearTimeout(timer);
			timer = window.setTimeout(() => {
				try {
					if (window.scrollY < FLOOR) localStorage.removeItem(k);
					else localStorage.setItem(k, JSON.stringify({ y: window.scrollY, t: Date.now() }));
				} catch {
					// storage unavailable (private mode) — the ribbon just doesn't hold
				}
			}, DWELL);
		};
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => {
			clearTimeout(timer);
			window.removeEventListener('scroll', onScroll);
		};
	});

	$effect(() => {
		const k = key();
		// The router applies its own scroll at its own pace — a reset to the
		// top on a fresh entry, the recorded position on history back — and
		// it can land either side of us. So watch a short window instead of
		// racing it: while the page sits where we put it, keep laying the
		// ribbon back down; the moment the scroll is anywhere else, stop and
		// leave it alone.
		let frames = 20;
		let live = true;
		let placed = 0;
		const attempt = () => {
			if (!live || --frames < 0 || skip()) return;
			const y = window.scrollY;
			if (y > 8 && Math.abs(y - placed) > 2) return; // not ours: someone means it
			const target = read(k);
			if (target === null) return;
			if (y !== target) {
				window.scrollTo({ top: target, behavior: 'auto' });
				placed = target;
			}
			requestAnimationFrame(attempt);
		};
		requestAnimationFrame(attempt);
		return () => {
			live = false;
		};
	});
}
