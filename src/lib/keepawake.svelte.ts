// The screen stays awake while a text is open — no switch. A phone that
// dims mid-Canon is the failure this exists to prevent, and a prayer book
// that needs a setting flipped before it will stay open is a worse prayer
// book. Navigation and recipe apps hold the same lock for the same reason:
// hands are busy, the reading is long, and the OS's idea of idle is wrong.
//
// It is bounded three ways, so nobody finds a flat battery: the browser
// drops the lock whenever the tab stops being visible, we let go after
// half an hour with no sign of a reader, and any scroll, tap or key wakes
// the whole arrangement up again. Locking the phone by hand always wins.

const IDLE = 30 * 60 * 1000;

export function keepAwake() {
	$effect(() => {
		if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;

		let sentinel: WakeLockSentinel | null = null;
		let idle = 0;
		let live = true;

		async function release() {
			const held = sentinel;
			sentinel = null;
			try {
				await held?.release();
			} catch {
				// already gone — nothing to let go of
			}
		}

		async function acquire() {
			if (!live || sentinel || document.visibilityState !== 'visible') return;
			try {
				const held = await navigator.wakeLock.request('screen');
				if (!live) {
					await held.release();
					return;
				}
				sentinel = held;
				// The system can take it back (battery saver, policy). Notice,
				// so the next sign of a reader asks again instead of assuming.
				held.addEventListener('release', () => {
					if (sentinel === held) sentinel = null;
				});
			} catch {
				// refused — the screen behaves as the OS prefers, silently
				sentinel = null;
			}
		}

		function stir() {
			clearTimeout(idle);
			idle = window.setTimeout(release, IDLE);
			void acquire();
		}

		function onVisibility() {
			if (document.visibilityState === 'visible') stir();
			else sentinel = null; // the browser released it for us
		}

		stir();
		const opts = { passive: true } as const;
		addEventListener('scroll', stir, opts);
		addEventListener('pointerdown', stir, opts);
		addEventListener('keydown', stir, opts);
		document.addEventListener('visibilitychange', onVisibility);

		return () => {
			live = false;
			clearTimeout(idle);
			removeEventListener('scroll', stir);
			removeEventListener('pointerdown', stir);
			removeEventListener('keydown', stir);
			document.removeEventListener('visibilitychange', onVisibility);
			void release();
		};
	});
}
