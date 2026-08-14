import { browser } from '$app/environment';

/** The text size, as three steps rather than a slider: it is set once and
 * it wants to be predictable, and three named values are testable in a way
 * a continuum is not. Mirrored by the pre-paint script in app.html, which
 * has to resolve the choice before anything is drawn — a reader who asked
 * for large print should not watch the page start small.
 *
 * The knob is the ROOT font size, so the whole book follows and not only
 * the Latin. It was --reading at first — the reading face alone — and the
 * owner was right that this is wrong: someone who cannot read a prayer at
 * the default cannot read the CATALOGUE at it either, nor the word panel,
 * nor the grammar. A setting called "text size" that reaches one surface
 * is a half-measure, and on the pages with no Latin on them it looked
 * broken, which is how the fault was found.
 *
 * Everything in this app is sized in rem, so scaling the root carries all
 * of it, and --reading stays 1.45rem: the reading face keeps its
 * proportion to the interface rather than being pinned to a number of
 * pixels. Media queries are unaffected — a rem in a media query is
 * measured against the browser's initial size, not this one — so the
 * breakpoints do not move under the reader. */
export const STEPS = {
	normal: '100%',
	larger: '120%',
	largest: '140%'
} as const;

export type Step = keyof typeof STEPS;
export const ORDER: Step[] = ['normal', 'larger', 'largest'];

const KEY = 'scrutabor-reading';

function stored(): Step {
	if (!browser) return 'normal';
	const raw = localStorage.getItem(KEY);
	return raw && raw in STEPS ? (raw as Step) : 'normal';
}

/** One number: every size in the app is a multiple of the root. */
function apply(step: Step) {
	document.documentElement.dataset.reading = step;
	document.documentElement.style.fontSize = STEPS[step];
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
