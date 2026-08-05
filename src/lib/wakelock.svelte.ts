// Screen Wake Lock: at Mass the phone lies open in the pew and must not
// dim mid-prayer. The switch is app-level module state, so paging through
// the book keeps it; it is deliberately not persisted — keeping a screen
// awake is situational, and a stale "on" would silently drain a battery
// days later. The OS releases the sentinel whenever the tab is hidden;
// while the switch is on we reacquire on every return to visibility.

let sentinel: WakeLockSentinel | null = null;
let watching = false;

export const wake = $state({ on: false });

export function wakeSupported(): boolean {
	return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
}

async function acquire(): Promise<void> {
	try {
		sentinel = await navigator.wakeLock.request('screen');
	} catch {
		// The browser refused (power saver, policy) — show the truth.
		sentinel = null;
		wake.on = false;
	}
}

export async function setWake(on: boolean): Promise<void> {
	wake.on = on;
	if (on) {
		if (!watching) {
			watching = true;
			document.addEventListener('visibilitychange', () => {
				if (wake.on && document.visibilityState === 'visible') void acquire();
			});
		}
		await acquire();
	} else {
		const s = sentinel;
		sentinel = null;
		await s?.release();
	}
}
