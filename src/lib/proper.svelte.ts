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

import { browser, dev } from '$app/environment';
import { readStored, writeStored } from '$lib/storage';
import { localDay, localCanon, localDismissal, localCommemoration } from '$lib/proper-local';
import {
	canonLookup,
	CANON_ROLES,
	isCanonRole,
	ordinaryCanon,
	selectedCanon,
	validateCanonPack,
	type CanonProfile,
	type CanonPack
} from '$lib/canon';
import {
	dismissalLookup,
	DISMISSAL_ROLE,
	ORDINARY_DISMISSAL,
	selectedDismissal,
	validateDismissalPack,
	type DismissalProfile,
	type DismissalPack
} from '$lib/dismissal';
import {
	COMMEMORATION_SLOTS,
	commemorationLookup,
	selectedCommemorations,
	SITUATIONS,
	validateCommemorationPack,
	type CommemorationDecision,
	type CommemorationEntry,
	type CommemorationPack,
	type CommemorationPlan,
	type SelectedCommemorationBody,
	type Situation
} from '$lib/commemorationes';
import type { VariantPack } from '$lib/variant-resource';
import { object, validateLocalizedBody } from '$lib/localized-body';
import { artifactRequestPath, componentApplies, dayById, SLOT_OF } from '$lib/proprium';
import { dayOn, isoDate } from '$lib/kalendarium';
import { massesOn, resolveOrdoChoice, ordoHref, type OrdoChoice } from '$lib/ordo-choice';
import { massForm } from '$lib/mass-form.svelte';
import type { Lang } from '$lib/i18n';
import type { ComponentCondition } from '$lib/corpus-metadata';
import type { TextBibliographyEvidence } from '$lib/bibliography';
import { properOccurrences } from '$lib/proper-occurrences';
import type { Lexicon, MassForm, Segment, TextDocument } from '$lib/corpus';

export interface ProperPartPayload {
	key: string;
	part: string;
	slot: string;
	condition?: ComponentCondition;
	/** The commemoration this oration belongs to; absent for the Mass's own parts. */
	commemoration?: string;
	/** A Secret followed by a commemoration's Secret: its ending is said quietly (RG 480–481). */
	nonfinal?: boolean;
	/** The sung situation this occurrence belongs to, where the two sung decisions differ and
	 * both are shown as described alternatives; absent where the sequence is determinate. */
	situation?: Situation;
	doc: unknown;
	gloss: unknown;
	bibliography: TextBibliographyEvidence;
}

/** One situation's complete sequence of the Mass, with what it owes but cannot yet show. */
interface Assembly {
	parts: ProperPartPayload[];
	unavailable: CommemorationEntry[];
	/** Which commemorations it makes and lacks, to tell two sung decisions apart. */
	plan: string;
}

/** A sequence the selected form of Mass makes of the commemoration slots. */
export interface CommemorationVariant {
	situation: Situation;
	/** The two sung decisions differ and the reader's low/sung choice cannot settle which
	 * applies: this sequence is one of two described alternatives, never a guessed default. */
	described: boolean;
	/** Required here and not yet in this edition (decision omitted-required-de-tempore-unavailable). */
	unavailable: CommemorationEntry[];
}

const COMMEMORATED_SLOTS: readonly string[] = COMMEMORATION_SLOTS;

function variantsOf(
	current: Record<Situation, Assembly> | null,
	form: MassForm
): CommemorationVariant[] {
	if (!current) return [];
	if (form === 'lecta')
		return [{ situation: 'lecta', described: false, unavailable: current.lecta.unavailable }];
	const conventual = current['cantu-conventualis'];
	const other = current['cantu-non-conventualis'];
	if (conventual.plan === other.plan)
		return [
			{ situation: 'cantu-conventualis', described: false, unavailable: conventual.unavailable }
		];
	return [
		{ situation: 'cantu-conventualis', described: true, unavailable: conventual.unavailable },
		{ situation: 'cantu-non-conventualis', described: true, unavailable: other.unavailable }
	];
}

export interface ProperPayload {
	day: string;
	title: Record<string, string>;
	lang: string;
	parts: ProperPartPayload[];
	lex: Lexicon;
}

const KEY = 'scrutabor-day';

/** The day this reader chose TODAY, or null if they have not chosen one today.
 *
 * A remembered Mass must still belong to its date. Prerender has no local
 * date or storage; the choice is applied once the reader is alive.
 *
 * It expires at midnight, and that is the whole point of storing the date
 * beside it. Walking the six movements of the Ordo must keep the day — losing
 * it at the Offertory is the defect the memory exists to prevent — but a
 * choice made last Sunday must not still be showing Advent in Lent, now that
 * the calendar can say what today is. The reading ribbon reasons the same way
 * and for the same reason (lib/ribbon).
 *
 * `mass: null` remembers an explicit choice of the Ordinary alone, still
 * attached to a date. A null result means there is no usable memory.
 */
export function storedChoice(): OrdoChoice | null {
	if (!browser) return null;
	// Through $lib/storage like every other module: the guard against a
	// storage that THROWS on access lives there and only there. The parse
	// guard here is for a malformed value, which is a different failure.
	const raw = readStored(KEY);
	if (raw === null || !raw.startsWith('{')) return null;
	try {
		const { date, mass, on } = JSON.parse(raw);
		if (on !== today() || typeof date !== 'string') return null;
		if (mass !== null && typeof mass !== 'string') return null;
		return resolveOrdoChoice(date, mass ?? 'none');
	} catch {
		return null;
	}
}

/** The reader's own date, not the world's. `toISOString` converts to UTC
 * first, which hands back yesterday for anyone east of Greenwich after
 * midnight — and midnight is exactly when this value changes meaning. */
function today(): string {
	return isoDate(new Date());
}

/** A link out of a page, carrying the day the reader is on.
 *
 * The address bar has to tell the truth about what is displayed, and the day
 * cannot be written there on arrival — that needs the router, which does not
 * exist yet at mount. So the day travels in the links instead: walking the six
 * movements keeps it, and any of those URLs can be sent to someone else and
 * opens the same Mass. */
export function dayHref(href: string): string {
	if (!date) return href;
	return ordoHref(href, { date, mass: day });
}

export function rememberChoice(choice: OrdoChoice): void {
	if (!browser) return;
	// A reader who has blocked storage still gets the day they picked, for
	// as long as the page lives — writeStored swallows the denial.
	writeStored(KEY, JSON.stringify({ ...choice, on: today() }));
}

let day = $state<string | null>(null);
let date = $state<string | null>(null);
let payload = $state<ProperPayload | null>(null);
let loading = $state(false);
let failed = $state(false);
let unwritten = $state(false);
let canonProfile = $state<CanonProfile | null>(null);
let dismissalProfile = $state<DismissalProfile | null>(null);
let decisions = $state<CommemorationDecision[]>([]);
// Replaced whole, never edited in place: the three sequences need no deep proxy.
let assemblies = $state.raw<Record<Situation, Assembly> | null>(null);

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
const heldPacks: Record<string, Promise<Record<string, ProperPayload>>> = {};
const heldCanon: Partial<Record<Lang, Promise<CanonPack>>> = {};
const heldDismissal: Partial<Record<Lang, Promise<DismissalPack>>> = {};
const heldCommemoration: Partial<Record<Lang, Promise<CommemorationPack>>> = {};

function forDate(source: ProperPayload, selectedDate: string): ProperPayload {
	const parts = source.parts.filter((part) => componentApplies(part.condition, selectedDate));
	return parts.length === source.parts.length ? source : { ...source, parts };
}

/** RG 480–481: when a commemoration's Secret follows, the Mass's own Secret keeps every word
 * and id, but the celebrant says its ending and Amen secreto, with no response and no
 * participation. Only the last Secret keeps the audible terminal. The canonical text is not
 * changed; the standalone page still shows it as printed. */
function quietConclusion(doc: unknown): unknown {
	const text = doc as TextDocument;
	let first = true;
	const segments = text.segments.map((segment: Segment) => {
		if (segment.type !== 'verse') return segment;
		if (first) {
			first = false;
			return segment;
		}
		const quiet: Segment = { ...segment, speaker: 'sacerdos', voice: 'secreto' };
		delete quiet.delivery;
		delete quiet.participation;
		return quiet;
	});
	return { ...text, segments };
}

/** The Mass's own Secret is not the last when a commemoration's Secret follows it, whether
 * this edition carries that Secret or the plan owes one it cannot yet supply. */
function withNonfinalSecret(parts: ProperPartPayload[], followed: boolean): ProperPartPayload[] {
	if (!followed) return parts;
	return parts.map((part) =>
		part.slot === 'secreta' && !part.commemoration
			? { ...part, nonfinal: true, doc: quietConclusion(part.doc) }
			: part
	);
}

function assembled(
	source: ProperPayload,
	selectedDate: string,
	profile: CanonProfile,
	pack: CanonPack | null,
	dismissal: DismissalProfile,
	dismissalPack: DismissalPack | null,
	plans: Record<Situation, CommemorationPlan>,
	commemorationPack: CommemorationPack | null = null
): { payload: ProperPayload; assemblies: Record<Situation, Assembly> } {
	const filtered = forDate(source, selectedDate);
	const fixed = [...selectedCanon(profile, pack), ...selectedDismissal(dismissal, dismissalPack)];
	let lex = filtered.lex;
	for (const extra of [pack, dismissalPack, commemorationPack]) {
		if (extra) {
			lex = {
				lemmata: { ...lex.lemmata, ...extra.lex.lemmata },
				senses: { ...lex.senses, ...extra.lex.senses }
			};
		}
	}
	// Each situation is assembled whole from the unmodified bodies: a change of the reader's
	// low/sung choice selects another sequence and never carries the previous one's prayers.
	const situations = Object.fromEntries(
		SITUATIONS.map((situation) => {
			const { admitted, unavailable } = plans[situation];
			const additions: SelectedCommemorationBody[] = selectedCommemorations(
				admitted,
				commemorationPack
			);
			const followed = additions.some((body) => body.slot === 'secreta') || unavailable.length > 0;
			return [
				situation,
				{
					parts: [
						...withNonfinalSecret(filtered.parts, followed),
						...additions.map(({ commemoration, ...body }) => ({ ...body, commemoration })),
						...fixed
					],
					unavailable,
					plan: JSON.stringify([
						admitted.map(({ commemoration }) => commemoration.id),
						unavailable.map(({ id }) => id)
					])
				}
			];
		})
	) as Record<Situation, Assembly>;
	return {
		payload: { ...filtered, parts: [...filtered.parts, ...fixed], lex },
		assemblies: situations
	};
}

/** The occurrences of one slot in the selected form. A described pair of sung sequences is
 * shown whole, one after the other: the first keeps the plain occurrence addresses and the
 * second names its situation, so repeated words never share a DOM or citation address. */
function occurrencesFor(slot: string, form: MassForm) {
	if (!payload) return [];
	const variants = variantsOf(assemblies, form);
	if (!assemblies || !variants.length)
		return properOccurrences(payload.parts).filter((p) => p.slot === slot);
	if (!variants[0].described || !COMMEMORATED_SLOTS.includes(slot))
		return properOccurrences(assemblies[variants[0].situation].parts).filter(
			(p) => p.slot === slot
		);
	return variants.flatMap(({ situation }, index) =>
		properOccurrences(assemblies![situation].parts)
			.filter((p) => p.slot === slot)
			.map((p) =>
				index === 0
					? { ...p, situation }
					: { ...p, situation, slug: `${p.slug}~${situation}`, anchor: `${p.anchor}~${situation}` }
			)
	);
}

export const proper = {
	get day(): string | null {
		return day;
	},
	/** The civil date being viewed, including one with no available proper. */
	get date(): string | null {
		return date;
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
	get paschalDismissal(): boolean {
		return dismissalProfile?.id === 'paschale';
	},
	/** Every decision the corpus publishes for the chosen date and Mass, in all situations. */
	get decisions(): CommemorationDecision[] {
		return decisions;
	},
	/** The sequences the selected form makes of the commemoration slots: one, or the two
	 * described sung alternatives. Empty until the chosen Mass is assembled. */
	get commemorationVariants(): CommemorationVariant[] {
		return payload ? variantsOf(assemblies, massForm.value) : [];
	},
	/** Occurrences to acknowledge on a date that has no represented Mass. Only a privileged
	 * commemoration is made in every Mass of its date, so only it may be announced without a
	 * pair; an ordinary one may be impeded there, and a represented Mass, even when the
	 * Ordinary alone was chosen, is not missing coverage. */
	get occurrences(): CommemorationEntry[] {
		if (!date || !commemorationLookup || massesOn(date).length) return [];
		return commemorationLookup.occurrencesOn(date).filter(({ rank }) => rank === 'privileged');
	},

	/** An unresolved initial choice is not permission to render an Ordinary formula. */
	variantRequired(slot: string): boolean {
		if (!isCanonRole(slot) && slot !== DISMISSAL_ROLE) return false;
		if (!date) return true;
		if (!day) return false;
		if (slot === DISMISSAL_ROLE)
			return !dismissalProfile || dismissalProfile.text !== ORDINARY_DISMISSAL;
		return !canonProfile || canonProfile.texts[slot] !== ordinaryCanon(slot);
	},
	/** Canonical presence for the chosen date, including while its body is unavailable. */
	hasSlot(slot: string): boolean {
		if (!day || !date) return false;
		return (
			dayById(day)?.components.some(
				(component) =>
					SLOT_OF[component.role] === slot && componentApplies(component.condition, date)
			) ?? false
		);
	},
	/** Loaded texts for one Ordo slot, in rite order, for the selected form of Mass. */
	forSlot(slot: string) {
		return occurrencesFor(slot, massForm.value);
	},
	clear(): void {
		current += 1;
		day = null;
		date = null;
		payload = null;
		assemblies = null;
		failed = false;
		unwritten = false;
		canonProfile = null;
		dismissalProfile = null;
		decisions = [];
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
export async function chooseDay(choice: OrdoChoice, lang: Lang): Promise<void> {
	const mine = ++current;
	const selected = resolveOrdoChoice(choice.date, choice.mass ?? 'none');
	canonProfile = null;
	dismissalProfile = null;
	decisions = [];
	assemblies = null;
	date = selected?.date ?? null;
	// Superseding a flight also takes over its notices: the superseded
	// finally below declines to touch shared state, so it is settled here.
	loading = false;
	stopTiming();
	failed = false;
	unwritten = false;
	if (!selected?.mass) {
		day = null;
		payload = null;
		unwritten = !!selected && !!dayOn(selected.date) && !resolveOrdoChoice(selected.date)?.mass;
		return;
	}
	const next = selected.mass;
	day = next;
	// A new heading must never sit over the previous day's prayers while its
	// artifact is still in flight. Clear without reading the reactive payload:
	// chooseDay is called inside the picker's effect, and reading it here would
	// make that effect depend on the response and replay the choice on arrival.
	payload = null;
	const key = `${lang}/${next}`;
	if (!browser) return;
	loading = true;
	startTiming();
	try {
		if (!canonLookup || !dismissalLookup || !commemorationLookup)
			throw new Error('dated text resource unavailable');
		const profile = canonLookup.resolve(selected.date, next);
		const dismissal = dismissalLookup.resolve(selected.date, next);
		const found = commemorationLookup.resolve(selected.date, next);
		const plans = Object.fromEntries(
			SITUATIONS.map((situation) => [
				situation,
				commemorationLookup!.plan(selected.date, next, situation)
			])
		) as Record<Situation, CommemorationPlan>;
		canonProfile = profile;
		dismissalProfile = dismissal;
		decisions = found;
		const needsPack = CANON_ROLES.some((role) => profile.texts[role] !== ordinaryCanon(role));
		const [body, pack, dismissalPack, commemorationPack] = await Promise.all([
			held[key] ?? load(next, lang),
			needsPack ? loadCanon(lang) : null,
			dismissal.text !== ORDINARY_DISMISSAL ? loadDismissal(lang) : null,
			SITUATIONS.some((situation) => plans[situation].admitted.length)
				? loadCommemoration(lang)
				: null
		]);
		held[key] = body;
		if (mine !== current) return;
		const result = assembled(
			body,
			selected.date,
			profile,
			pack,
			dismissal,
			dismissalPack,
			plans,
			commemorationPack
		);
		assemblies = result.assemblies;
		payload = result.payload;
	} catch {
		if (mine !== current) return;
		failed = true;
		payload = null;
		assemblies = null;
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
 * The hosted reader groups several formularies in one transport pack. The
 * selected day is still the cache unit above, while repeated requests for a
 * neighbouring day reuse the already downloaded pack.
 */
async function load(day: string, lang: Lang): Promise<ProperPayload> {
	const here = await localDay(day, lang);
	if (here) return validateProper(here, day, lang);
	const path = artifactRequestPath(day, lang, dev);
	if (!path) throw new Error('unknown formulary');
	// Bounded: a request that never answers would otherwise leave the
	// loading notice up forever, with re-picking as the only way out.
	const packKey = `${lang}/${path}`;
	const pending = (heldPacks[packKey] ??= fetch(path, {
		signal: AbortSignal.timeout(15_000)
	}).then(async (response) => {
		if (!response.ok) throw new Error(String(response.status));
		return ((await response.json()) as { days: Record<string, ProperPayload> }).days;
	}));
	let packed: Record<string, ProperPayload>;
	try {
		packed = await pending;
		const found = packed?.[day];
		return validateProper(found, day, lang);
	} catch (cause) {
		// A failed request is not data. Remove only the promise that failed so a
		// later choice can retry; do not delete a newer retry racing behind it.
		if (heldPacks[packKey] === pending) delete heldPacks[packKey];
		throw cause;
	}
}

function validateProper(value: unknown, day: string, lang: Lang): ProperPayload {
	const authored = dayById(day);
	if (
		!authored ||
		!object(value) ||
		value.day !== day ||
		value.lang !== lang ||
		!Array.isArray(value.parts) ||
		value.parts.length !== authored.components.length
	)
		throw new Error('invalid formulary payload');
	for (const [index, part] of value.parts.entries()) {
		const expected = authored.components[index];
		if (
			!object(part) ||
			part.key !== expected.text ||
			part.part !== expected.role ||
			part.slot !== SLOT_OF[expected.role] ||
			JSON.stringify(part.condition) !== JSON.stringify(expected.condition)
		)
			throw new Error('invalid formulary part identity');
		validateLocalizedBody(part, lang, value.lex);
	}
	return value as unknown as ProperPayload;
}

async function loadCanon(lang: Lang): Promise<CanonPack> {
	return loadVariant(lang, 'canon', localCanon, validateCanonPack, heldCanon);
}

async function loadDismissal(lang: Lang): Promise<DismissalPack> {
	return loadVariant(lang, 'dismissal', localDismissal, validateDismissalPack, heldDismissal);
}

async function loadCommemoration(lang: Lang): Promise<CommemorationPack> {
	return loadVariant(
		lang,
		'commemorationes',
		localCommemoration,
		validateCommemorationPack,
		heldCommemoration
	);
}

async function loadVariant<Role extends string>(
	lang: Lang,
	resource: 'canon' | 'dismissal' | 'commemorationes',
	local: (lang: Lang) => Promise<unknown | null>,
	validate: (value: unknown, lang: Lang) => VariantPack<Role>,
	cache: Partial<Record<Lang, Promise<VariantPack<Role>>>>
): Promise<VariantPack<Role>> {
	const pending = (cache[lang] ??= (async () => {
		const here = await local(lang);
		if (here) return validate(here, lang);
		const response = await fetch(`/artifacts/${resource}/${lang}.json${dev ? '?dev=1' : ''}`, {
			signal: AbortSignal.timeout(15_000)
		});
		if (!response.ok) throw new Error(String(response.status));
		return validate(await response.json(), lang);
	})());
	try {
		return await pending;
	} catch (cause) {
		if (cache[lang] === pending) delete cache[lang];
		throw cause;
	}
}
