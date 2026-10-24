/** Resolve the corpus-owned introduction slot separately for every selected reading. */
import type { GlossDocument, TextDocument } from './corpus';
import type { AnnouncementBinding } from './introduction-contract';
import type { TextBibliographyEvidence } from './bibliography';
import { resolveOrdoChoice } from './ordo-choice';
import { validateReadingDelivery } from './reading-delivery';
import { introductionBodies, introductionLookup } from './introductiones';
import type {
	IntroductionEvent,
	IntroductionLookup,
	IntroductionOccurrence
} from './introduction-contract';

export interface AnnouncementOwner {
	doc: TextDocument;
	gloss: GlossDocument;
	bibliography: TextBibliographyEvidence;
}
export interface AnnouncedReading extends AnnouncementOwner {
	key: string;
	slug: string;
	anchor: string;
	readingReference?: string;
	/** The printed reference is retained even where its pericope has a declared correction. */
	referenceMisprint?: true;
	/** The literal scan reading is uncertain, not a proved printing error. */
	referenceUncertain?: true;
	/** Normalized passage locator, never a silent replacement of the scan reading. */
	readingPericope?: string;
}

/** A transport is keyed by Mass and language, not civil date. chooseDay owns the
 * date-dependent assembly and discards superseded flights before publishing it. */
export function readingPayloadReady(
	state: {
		date: string | null;
		mass: string | null;
		loadedMass: string | null;
		loadedLanguage: string | null;
		loading: boolean;
		failed: boolean;
		unwritten: boolean;
	},
	language: string
): boolean {
	return (
		state.date !== null &&
		state.mass !== null &&
		resolveOrdoChoice(state.date, state.mass)?.mass === state.mass &&
		!state.loading &&
		!state.failed &&
		!state.unwritten &&
		state.loadedMass === state.mass &&
		state.loadedLanguage === language
	);
}

export function announcementOwners(lookup = introductionLookup): string[] {
	if (!lookup) throw new Error('introduction resource unavailable');
	const names = new Set(
		[...lookup.units.values()].filter((u) => u.role === 'announcement').map((u) => u.text)
	);
	for (const id of ['evangelium-salutatio', 'evangelium-annuntiatio'])
		for (const occurrence of lookup.events.find((e) => e.id === id)!.occurrences)
			if ('unit' in occurrence) names.add(lookup.units.get(occurrence.unit)!.text);
	return [...names];
}

function event(id: string, lookup: IntroductionLookup): IntroductionEvent {
	const found = lookup.events.find((e) => e.id === id);
	if (!found) throw new Error(`missing reading event ${id}`);
	return found;
}

function pericopeReference(pericope: AnnouncementBinding['pericope']): string {
	return `${pericope.book} ${pericope.passages
		.map(
			(p) =>
				`${p.chapter}, ${p.verses.map(([first, last]) => (first === last ? first : `${first}–${last}`)).join(', ')}`
		)
		.join('; ')}`;
}

/** A reading's existing occurrence is the identity boundary. Repeated announcement owners
 * get distinct anchors without changing any canonical word or segment id. */
export function announcedReadings<T extends AnnouncedReading>(
	role: string,
	readings: T[],
	owners: Record<string, AnnouncementOwner | undefined>,
	lookup = introductionLookup
): (T & {
	readingReference?: string;
	referenceMisprint?: true;
	referenceUncertain?: true;
	readingPericope?: string;
})[] {
	if (role !== 'epistola' && role !== 'evangelium') return readings;
	if (!readings.length) return readings;
	if (!lookup) throw new Error('introduction resource unavailable');
	if (
		new Set(readings.map((r) => r.slug)).size !== readings.length ||
		new Set(readings.map((r) => r.anchor)).size !== readings.length
	)
		throw new Error('duplicate reading occurrence address');
	const result: (T & {
		readingReference?: string;
		referenceMisprint?: true;
		referenceUncertain?: true;
		readingPericope?: string;
	})[] = [];
	for (const reading of readings) {
		if (reading.doc.id !== reading.key.replace('/', '.') || reading.gloss.text !== reading.doc.id)
			throw new Error('reading owner identity differs');
		const binding = lookup.announcements.get(reading.key);
		if (!binding) throw new Error(`reading ${reading.key} has no announcement`);
		const passion = lookup.passion.units.includes(binding.unit);
		const announcement = lookup.units.get(binding.unit)!;
		if ((announcement.id.startsWith('lectio-') ? 'epistola' : 'evangelium') !== role)
			throw new Error('announcement names a different reading role');
		validateReadingDelivery(role, reading.key, reading.doc, lookup);
		const events: IntroductionEvent[] = [];
		if (role === 'evangelium' && !passion) events.push(event('evangelium-salutatio', lookup));
		const announced = event(
			role === 'epistola' ? 'epistola-annuntiatio' : 'evangelium-annuntiatio',
			lookup
		);
		const occurrences: IntroductionOccurrence[] = announced.occurrences.flatMap((occurrence) => {
			if ('unit' in occurrence)
				return passion && lookup.passion.omitted_units.includes(occurrence.unit)
					? []
					: [occurrence];
			return [
				{
					unit: binding.unit,
					lecta: passion ? lookup.passion.lecta : occurrence.lecta,
					cantu: passion ? lookup.passion.cantu : occurrence.cantu
				}
			];
		});
		events.push({ ...announced, occurrences });
		for (const intro of events) {
			for (const run of introductionBodies(intro, owners, lookup)) {
				const owner = owners[run.key];
				if (!owner) throw new Error(`announcement owner ${run.key} missing`);
				if (owner.gloss.lang !== reading.gloss.lang)
					throw new Error('announcement owner language differs');
				result.push({
					...reading,
					...run,
					bibliography: owner.bibliography,
					slug: `${run.slug}~${reading.slug}`,
					anchor: `${run.anchor}~${reading.slug}`,
					readingReference: undefined,
					referenceMisprint: undefined,
					referenceUncertain: undefined,
					readingPericope: undefined,
					condition: undefined,
					commemoration: undefined,
					nonfinal: undefined,
					situation: undefined
				} as T);
			}
		}
		result.push({
			...reading,
			readingReference: binding.reference,
			referenceMisprint: binding.misprint,
			referenceUncertain: binding.reference_uncertain,
			readingPericope:
				binding.misprint || binding.reference_uncertain
					? pericopeReference(binding.pericope)
					: undefined
		});
	}
	return result;
}
