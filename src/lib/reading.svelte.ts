import { browser } from '$app/environment';

/** The reading size, as three steps rather than a slider: it is set once
 * and it wants to be predictable, and three named values are testable in a
 * way a continuum is not. Mirrored by the pre-paint script in app.html,
 * which has to resolve the choice before anything is drawn — a reader who
 * asked for large print should not watch the page start small. */
export const STEPS = {
	normal: '1.45rem',
	larger: '1.75rem',
	largest: '2.05rem'
} as const;

export type Step = keyof typeof STEPS;
export const ORDER: Step[] = ['normal', 'larger', 'largest'];

const KEY = 'scrutabor-reading';

function stored(): Step {
	if (!browser) return 'normal';
	const raw = localStorage.getItem(KEY);
	return raw && raw in STEPS ? (raw as Step) : 'normal';
}

/** Everything on a reading surface is a multiple of --reading (see
 * app.css), so this one property is the whole setting. */
function apply(step: Step) {
	document.documentElement.style.setProperty('--reading', STEPS[step]);
}

export const reading = (() => {
	// Prerender has no localStorage, so the served HTML is always the
	// default; the choice is applied by app.html before first paint and
	// this picks it up on mount.
	let value = $state<Step>('normal');
	return {
		get value() {
			return value;
		},
		sync() {
			value = stored();
		},
		set(next: Step) {
			value = next;
			apply(next);
			if (browser) localStorage.setItem(KEY, next);
		},
		/** One button, three steps: the nav has room for an icon, not a
		 * segmented control, and the reader is choosing along one axis. */
		next() {
			this.set(ORDER[(ORDER.indexOf(value) + 1) % ORDER.length]);
		}
	};
})();
