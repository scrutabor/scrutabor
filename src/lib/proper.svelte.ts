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
import { readStored, writeStored } from '$lib/storage';
import { localDay } from '$lib/proper-local';
import { artifactPath, dayById } from '$lib/proprium';
import { formularyExists } from '$lib/kalendarium';
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

/** The day this reader chose TODAY, or null if they have not chosen one today.
 *
 * Never validated here: the list of days is the picker's business and a stale
 * id simply fails to resolve. Prerender has no localStorage, so the served
 * HTML is always the dayless view and the reader's own choice is applied once
 * the page is alive, exactly as the role is.
 *
 * It expires at midnight, and that is the whole point of storing the date
 * beside it. Walking the six movements of the Ordo must keep the day — losing
 * it at the Offertory is the defect the memory exists to prevent — but a
 * choice made last Sunday must not still be showing Advent in Lent, now that
 * the calendar can say what today is. The reading ribbon reasons the same way
 * and for the same reason (lib/ribbon).
 *
 * An empty string is a real answer: the reader asked for no formulary, and
 * that holds for the day too. `null` means they have not said.
 */
export function storedDay(): string | null {
	if (!browser) return null;
	// Through $lib/storage like every other module: the guard against a
	// storage that THROWS on access lives there and only there. The parse
	// guard here is for a malformed value, which is a different failure.
	const raw = readStored(KEY);
	// Before the date was stored beside it the value was the bare id.
	// Treat that as spent rather than as chosen today.
	if (raw === null || !raw.startsWith('{')) return null;
	try {
		const { d, on } = JSON.parse(raw);
		return typeof d === 'string' && on === today() ? d : null;
	} catch {
		return null;
	}
}

/** The reader's own date, not the world's. `toISOString` converts to UTC
 * first, which hands back yesterday for anyone east of Greenwich after
 * midnight — and midnight is exactly when this value changes meaning. */
function today(): string {
	const now = new Date();
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
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
	// A reader who has blocked storage still gets the day they picked, for
	// as long as the page lives — writeStored swallows the denial.
	writeStored(KEY, JSON.stringify({ d: id, on: today() }));
}

let day = $state<string | null>(null);
let payload = $state<ProperPayload | null>(null);
let loading = $state(false);
let failed = $state(false);
let unwritten = $state(false);

// Choices supersede one another. Two picks can be in flight at once — the
// second is the reader correcting themselves — and the responses come back in
// whatever order the network pleases. Without this, the FIRST response landed
// last and won: the control read one Sunday over another Sunday's Introit,
// reproduced eight times out of eight in review. Only the call that is still
// current may write the shared state; a superseded response still fills the
// cache, because the data is true even when the moment for it has passed.
let current = 0;

// A load worth telling the reader about. Not the same thing as a load.
//
// The artifact is ~20K and usually comes from the cache or from disk, so the
// fetch takes about 30 ms — and a notice that appears and vanishes inside two
// frames tells nobody anything. What it DID do was resize the control it sits
// in, from 200px to 291px and back, which is a visible jolt on the one page
// that is otherwise perfectly still. The owner saw it on the first pick and on
// every reload.
//
// So the notice waits. Past this many milliseconds a load is genuinely slow —
// a phone on a bad signal, which is the case the notice exists for — and the
// shift it causes is worth what it says.
const SLOW_AFTER = 400;
let slow = $state(false);
let slowTimer: ReturnType<typeof setTimeout> | null = null;

function startTiming(): void {
	stopTiming();
	slowTimer = setTimeout(() => {
		slow = true;
	}, SLOW_AFTER);
}

function stopTiming(): void {
	if (slowTimer !== null) clearTimeout(slowTimer);
	slowTimer = null;
	slow = false;
}

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
	/** True only once a load has run long enough to be worth announcing. */
	get slow(): boolean {
		return slow;
	},
	/** True when a day was asked for and could not be had. */
	get failed(): boolean {
		return failed;
	},
	/** True when the day asked for is real and this edition has not written
	 * its Mass yet. A different absence from `failed`: nothing went wrong. */
	get unwritten(): boolean {
		return unwritten;
	},
	/** The texts for one Ordo slot, in rite order. Empty when no day is chosen. */
	forSlot(slot: string): ProperPartPayload[] {
		return payload?.parts.filter((p) => p.slot === slot) ?? [];
	},
	clear(): void {
		current += 1;
		day = null;
		payload = null;
		failed = false;
		unwritten = false;
		loading = false;
		stopTiming();
	}
};

/** Choose a day, fetching its texts if they are not already held.
 *
 * Never throws: a missing artifact leaves the slots as they were and raises
 * `failed`, because a reader whose network died mid-Mass should still see the
 * Ordo rather than a broken page.
 */
export async function chooseDay(next: string | null, lang: Lang): Promise<void> {
	const mine = ++current;
	// Superseding a flight also takes over its notices: the superseded
	// finally below declines to touch shared state, so it is settled here.
	loading = false;
	stopTiming();
	failed = false;
	unwritten = false;
	if (!next) {
		proper.clear();
		return;
	}
	if (!dayById(next)) {
		// Two different absences. A real day of the calendar whose Mass this
		// edition has not written is said so. An id that names nothing is a
		// mangled link and gets the dayless view — "could not be loaded"
		// would promise a retry that cannot succeed.
		day = null;
		payload = null;
		unwritten = formularyExists(next);
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
	startTiming();
	try {
		const body = await load(next, lang);
		held[key] = body;
		if (mine !== current) return;
		payload = body;
	} catch {
		if (mine !== current) return;
		failed = true;
		payload = null;
	} finally {
		if (mine === current) {
			loading = false;
			stopTiming();
		}
	}
}

/** One day, from wherever this copy of the book keeps it.
 *
 * The site fetches a prerendered file. A downloaded copy carries the whole
 * corpus in its runtime and answers from memory (see $lib/proper-local) —
 * which is also the only thing that can work there, since Chrome refuses
 * `fetch()` for file:// outright: "URL scheme file is not supported".
 *
 * It replaced a classic-script transport that loaded one `window.__scrutabor
 * _day=…` file per day. That worked, and at the whole church year it would
 * have been 400 files and about 8 MB of what the runtime already holds.
 */
async function load(day: string, lang: Lang): Promise<ProperPayload> {
	const here = await localDay(day, lang);
	if (here) return here as ProperPayload;
	// Bounded: a request that never answers would otherwise leave the
	// loading notice up forever, with re-picking as the only way out.
	const response = await fetch(artifactPath(day, lang), { signal: AbortSignal.timeout(15_000) });
	if (!response.ok) throw new Error(String(response.status));
	return (await response.json()) as ProperPayload;
}
