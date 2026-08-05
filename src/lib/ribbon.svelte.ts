// Reading-position memory — the book's ribbon. Every long reading surface
// reopens where the reader left it: the per-text pages and the ordo flow,
// which is the longest of them and the one a reader in a pew most needs to
// come back to.
//
// Call once during component init with a key that names the surface.
// Positions are stored per surface, not per language, so switching
// languages resumes in place, and expire after twelve hours: a return
// mid-Mass resumes, next Sunday opens at the top.

import { afterNavigate } from '$app/navigation';

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

	// Restore when the router says it is done, not on a timer: afterNavigate
	// fires once the new page is in place and SvelteKit has applied its own
	// scroll — a reset to the top on a fresh entry, or a real recorded
	// position on history back. Polling for that moment worked until the
	// machine was busy, which is exactly when it must not fail.
	afterNavigate(() => {
		if (skip()) return;
		// The router put the reader somewhere on purpose — leave it.
		if (window.scrollY > 8) return;
		const target = read(key());
		if (target === null) return;
		const apply = () => window.scrollTo({ top: target, behavior: 'auto' });
		apply();
		// Two frames of insurance for any scroll the browser applies late
		// (restoration on reload arrives after the first paint).
		requestAnimationFrame(apply);
		requestAnimationFrame(() => requestAnimationFrame(apply));
	});
}
