// Which day's proper the reader is looking at, and its texts once fetched.
//
// The Ordo is the spine of ANY Mass, so it carries slots rather than texts
// where the day decides — already labelled *z formularza dnia*. Choosing a day
// fills them. The day is FETCHED, not built into the page: prerendering the
// combinations would cost 90 MB at the Sundays-and-feasts scope, and changing
// the date would mean a navigation (decisions #27, revised 2026-08-18).
//
// The choice lives in the URL, not only in memory. A reader who sends someone
// the page they are looking at must send the day with it, and a reader who
// reloads must not lose it.
//
// It ALSO lives in localStorage, because the Ordo is six pages and a reader
// walks them. Picking the day on the Introit and losing it at the Offertory
// is the same defect as losing the role would be, and the role has been
// remembered all along. The URL still wins where it speaks: a link someone
// was sent names a day on purpose, and that day is what they must see.

import { browser } from '$app/environment';
import { artifactPath, dayById } from '$lib/proprium';
import type { Lang } from '$lib/i18n';

export interface ProperPartPayload {
	key: string;
	part: string;
	slot: string;
	doc: unknown;
	gloss: unknown;
}

export interface ProperPayload {
	day: string;
	title: Record<string, string>;
	lang: string;
	parts: ProperPartPayload[];
	lex: Record<string, unknown>;
}

/** The query parameter that carries the choice. */
export const DAY_PARAM = 'dies';

const KEY = 'scrutabor-day';

/** The day this reader last chose, or '' — never validated here, because the
 * list of days is the picker's business and a stale id simply fails to
 * resolve. Prerender has no localStorage, so the served HTML is always the
 * dayless view and the reader's own choice is applied once the page is
 * alive, exactly as the role is. */
export function storedDay(): string {
	if (!browser) return '';
	try {
		return localStorage.getItem(KEY) ?? '';
	} catch {
		return '';
	}
}

/** A link out of a page, carrying the day the reader is on.
 *
 * The address bar has to tell the truth about what is displayed, and the day
 * cannot be written there on arrival — that needs the router, which does not
 * exist yet at mount. So the day travels in the links instead: walking the six
 * movements keeps it, and any of those URLs can be sent to someone else and
 * opens the same Mass. */
export function dayHref(href: string): string {
	if (!day) return href;
	const join = href.includes('?') ? '&' : '?';
	return `${href}${join}${DAY_PARAM}=${encodeURIComponent(day)}`;
}

export function rememberDay(id: string): void {
	if (!browser) return;
	try {
		if (id) localStorage.setItem(KEY, id);
		else localStorage.removeItem(KEY);
	} catch {
		// A reader who has blocked storage still gets the day they picked,
		// for as long as the page lives. Nothing here is worth an error.
	}
}

let day = $state<string | null>(null);
let payload = $state<ProperPayload | null>(null);
let loading = $state(false);
let failed = $state(false);

// One day at a time is what a reader looks at, but going back to yesterday
// should not re-fetch. A plain object, not a Map: nothing renders from this,
// it only spares the network, and the lint rule against mutable built-in
// collections is right that a Map here would not be reactive anyway.
const held: Record<string, ProperPayload> = {};

export const proper = {
	get day(): string | null {
		return day;
	},
	get payload(): ProperPayload | null {
		return payload;
	},
	get loading(): boolean {
		return loading;
	},
	/** True when a day was asked for and could not be had. */
	get failed(): boolean {
		return failed;
	},
	/** The texts for one Ordo slot, in rite order. Empty when no day is chosen. */
	forSlot(slot: string): ProperPartPayload[] {
		return payload?.parts.filter((p) => p.slot === slot) ?? [];
	},
	clear(): void {
		day = null;
		payload = null;
		failed = false;
	}
};

/** Choose a day, fetching its texts if they are not already held.
 *
 * Never throws: a missing artifact leaves the slots as they were and raises
 * `failed`, because a reader whose network died mid-Mass should still see the
 * Ordo rather than a broken page.
 */
export async function chooseDay(next: string | null, lang: Lang): Promise<void> {
	failed = false;
	if (!next) {
		proper.clear();
		return;
	}
	if (!dayById(next)) {
		failed = true;
		return;
	}
	day = next;
	const key = `${lang}/${next}`;
	const already = held[key];
	if (already) {
		payload = already;
		return;
	}
	if (!browser) return;
	loading = true;
	try {
		const body = await load(next, lang);
		held[key] = body;
		payload = body;
	} catch {
		failed = true;
		payload = null;
	} finally {
		loading = false;
	}
}

/** Whether this copy of the book has an origin to fetch from.
 *
 * The offline build injects `__scrutabor_up` on every page. Its presence is
 * also the signal that there is no server here — the book is wherever the
 * reader unzipped it.
 */
function downloaded(): boolean {
	return (globalThis as { __scrutabor_up?: string }).__scrutabor_up !== undefined;
}

function load(day: string, lang: Lang): Promise<ProperPayload> {
	return downloaded() ? loadByScript(day, lang) : loadByFetch(day, lang);
}

async function loadByFetch(day: string, lang: Lang): Promise<ProperPayload> {
	const response = await fetch(artifactPath(day, lang));
	if (!response.ok) throw new Error(String(response.status));
	return (await response.json()) as ProperPayload;
}

/** The downloaded copy's way in.
 *
 * Chrome refuses `fetch()` for file:// — "URL scheme file is not supported" —
 * so a downloaded book cannot ask for a day the way the site does. A classic
 * script still loads, which is the same reason the offline runtime is an IIFE
 * and not a module, and the offline build writes one of these beside every
 * day's JSON. Still one day at a time: this is a different transport, not a
 * different amount of data.
 */
function loadByScript(day: string, lang: Lang): Promise<ProperPayload> {
	return new Promise((resolve, reject) => {
		const holder = globalThis as { __scrutabor_day?: ProperPayload };
		const script = document.createElement('script');
		script.src = artifactPath(day, lang).replace(/\.json$/, '.js');
		script.onload = () => {
			const body = holder.__scrutabor_day;
			delete holder.__scrutabor_day;
			script.remove();
			if (body) resolve(body);
			else reject(new Error('the day loaded nothing'));
		};
		script.onerror = () => {
			script.remove();
			reject(new Error('the day could not be loaded'));
		};
		document.head.append(script);
	});
}
