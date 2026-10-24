/** Closed reader introduction contract, schema 2.0.0. */
import type { Speaker, Voice } from './corpus';
import { object, exactKeys } from './variant-resource';

export const INTRODUCTION_ROLES = [
	'greeting',
	'response',
	'invitation',
	'gospel-response',
	'announcement'
] as const;
export type IntroductionRole = (typeof INTRODUCTION_ROLES)[number];
export type ReadingRole = 'epistola' | 'evangelium';
export interface IntroductionUnit {
	id: string;
	role: IntroductionRole;
	text: string;
	segment: string;
	words: string[];
	source: string;
}
export interface IntroductionDelivery {
	speaker: Speaker;
	voice: Voice;
	source: string;
}
export interface IntroductionOccurrence {
	unit: string;
	lecta: IntroductionDelivery;
	cantu: IntroductionDelivery;
}
export interface AnnouncementSlot {
	slot: 'announcement';
	lecta: IntroductionDelivery;
	cantu: IntroductionDelivery;
}
export interface IntroductionEvent {
	id: string;
	before: string;
	source: string;
	occurrences: (IntroductionOccurrence | AnnouncementSlot)[];
}
export interface AnnouncementBinding {
	reading: string;
	unit: string;
	reference: string;
	pericope: { book: string; passages: { chapter: number; verses: [number, number][] }[] };
	book_supplied?: true;
	misprint?: true;
	reference_uncertain?: true;
}
export interface PassionRule {
	units: string[];
	omitted_events: string[];
	omitted_units: string[];
	lecta: IntroductionDelivery;
	cantu: IntroductionDelivery;
	source: string;
}
export const EVENT_CONTRACT = [
	['collecta-introductio', 'collecta', ['greeting', 'response', 'invitation']],
	['epistola-annuntiatio', 'epistola', ['announcement']],
	['evangelium-salutatio', 'evangelium', ['greeting', 'response']],
	['evangelium-annuntiatio', 'evangelium', ['announcement', 'gospel-response']],
	['offertorium-introductio', 'offertorium', ['greeting', 'response', 'invitation']],
	['postcommunio-introductio', 'postcommunio', ['greeting', 'response', 'invitation']]
] as const;
const FIXED = {
	'invitatio-oremus': ['invitation', 'ordinarium/aufer-a-nobis', 's02'],
	'responsio-gloria-tibi': ['gospel-response', 'ordinarium/evangelium-ultimum', 's06'],
	'responsio-salutationis': ['response', 'ordinarium/praefatio-dialogus', 's03'],
	salutatio: ['greeting', 'ordinarium/praefatio-dialogus', 's02']
} as const;
export const ANNOUNCEMENT_BOOKS: Record<string, readonly string[]> = {
	'initium-sancti-evangelii-secundum-ioannem': ['Ioann'],
	'initium-sancti-evangelii-secundum-matthaeum': ['Matth'],
	'lectio-actuum-apostolorum': ['Act'],
	'lectio-epistolae-beati-iacobi-apostoli': ['Iac'],
	'lectio-epistolae-beati-ioannis-apostoli': ['1 Ioann', '2 Ioann', '3 Ioann'],
	'lectio-epistolae-beati-pauli-apostoli-ad-colossenses': ['Col'],
	'lectio-epistolae-beati-pauli-apostoli-ad-corinthios': ['1 Cor', '2 Cor'],
	'lectio-epistolae-beati-pauli-apostoli-ad-ephesios': ['Ephes'],
	'lectio-epistolae-beati-pauli-apostoli-ad-galatas': ['Gal'],
	'lectio-epistolae-beati-pauli-apostoli-ad-hebraeos': ['Hebr'],
	'lectio-epistolae-beati-pauli-apostoli-ad-philippenses': ['Philipp'],
	'lectio-epistolae-beati-pauli-apostoli-ad-romanos': ['Rom'],
	'lectio-epistolae-beati-pauli-apostoli-ad-thessalonicenses': ['1 Thess', '2 Thess'],
	'lectio-epistolae-beati-pauli-apostoli-ad-titum': ['Tit'],
	'lectio-epistolae-beati-petri-apostoli': ['1 Petr', '2 Petr'],
	'lectio-ezechielis-prophetae': ['Ezech'],
	'lectio-isaiae-prophetae': ['Isai'],
	'lectio-libri-apocalypsis-beati-ioannis-apostoli': ['Apoc'],
	'lectio-libri-iudith': ['Iudith'],
	'lectio-libri-machabaeorum': ['1 Mach', '2 Mach'],
	'lectio-libri-sapientiae': ['Prov', 'Eccl', 'Cant', 'Sap', 'Eccli'],
	'lectio-malachiae-prophetae': ['Malach'],
	'passio-domini-nostri-iesu-christi-secundum-matthaeum': ['Matth'],
	'sequentia-sancti-evangelii-secundum-ioannem': ['Ioann'],
	'sequentia-sancti-evangelii-secundum-lucam': ['Luc'],
	'sequentia-sancti-evangelii-secundum-marcum': ['Marc'],
	'sequentia-sancti-evangelii-secundum-matthaeum': ['Matth']
};
const ADDRESS = /^[a-z]+\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const WORD = /^w[0-9]{3,}$/;
const positive = (n: unknown): n is number =>
	typeof n === 'number' && Number.isSafeInteger(n) && n > 0;
const nonempty = (s: unknown): s is string => typeof s === 'string' && s.trim().length > 0;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function reject(reason: string): never {
	throw new Error(`introductiones: ${reason}`);
}

export function roleActor(role: IntroductionRole, form: 'lecta' | 'cantu'): Speaker {
	return role === 'response' || role === 'gospel-response'
		? form === 'lecta'
			? 'minister'
			: 'schola'
		: 'sacerdos';
}

function delivery(value: unknown, role: IntroductionRole, sung: Voice): void {
	if (!object(value)) reject('invalid introduction occurrence');
	for (const form of ['lecta', 'cantu'] as const) {
		const item = value[form];
		if (
			!object(item) ||
			!exactKeys(item, ['speaker', 'voice', 'source']) ||
			item.speaker !== roleActor(role, form) ||
			item.voice !== (form === 'lecta' ? 'clara' : sung) ||
			!nonempty(item.source)
		)
			reject('invalid introduction delivery actor or voice');
	}
}

export interface IntroductionLookup {
	units: Map<string, IntroductionUnit>;
	events: IntroductionEvent[];
	passion: PassionRule;
	announcements: Map<string, AnnouncementBinding>;
}

/** Reading roles come from the corpus formulary catalog, never inferred from file names. */
export function parseIntroductionResource(
	value: unknown,
	knownTexts: ReadonlySet<string>,
	readingRoles: ReadonlyMap<string, ReadingRole>
): IntroductionLookup {
	if (
		!object(value) ||
		!exactKeys(value, ['schema_version', 'units', 'events', 'passion', 'announcements']) ||
		value.schema_version !== '2.0.0' ||
		!Array.isArray(value.units) ||
		!Array.isArray(value.events) ||
		!Array.isArray(value.announcements) ||
		!readingRoles.size
	)
		reject('invalid introduction resource');
	const expectedUnits = [...Object.keys(FIXED), ...Object.keys(ANNOUNCEMENT_BOOKS)].sort();
	const units = new Map<string, IntroductionUnit>();
	for (const unit of value.units) {
		if (
			!object(unit) ||
			!exactKeys(unit, ['id', 'role', 'text', 'segment', 'words', 'source']) ||
			!nonempty(unit.id) ||
			units.has(unit.id) ||
			!expectedUnits.includes(unit.id) ||
			!nonempty(unit.text) ||
			!ADDRESS.test(unit.text) ||
			!knownTexts.has(unit.text) ||
			!Array.isArray(unit.words) ||
			!unit.words.length ||
			new Set(unit.words).size !== unit.words.length ||
			unit.words.some((w) => typeof w !== 'string' || !WORD.test(w)) ||
			!nonempty(unit.source)
		)
			reject('invalid introduction unit');
		const fixed = FIXED[unit.id as keyof typeof FIXED];
		const owner =
			unit.id === 'initium-sancti-evangelii-secundum-ioannem'
				? 'ordinarium/evangelium-ultimum'
				: `ordinarium/${unit.id}`;
		if (
			fixed
				? !same([unit.role, unit.text, unit.segment], fixed)
				: unit.role !== 'announcement' ||
					unit.text !== owner ||
					unit.segment !== (unit.id === 'initium-sancti-evangelii-secundum-ioannem' ? 's05' : 's01')
		)
			reject('invalid introduction unit role or owner');
		units.set(unit.id, unit as unknown as IntroductionUnit);
	}
	if (!same([...units.keys()], expectedUnits)) reject('introduction units out of order or missing');
	if (value.events.length !== EVENT_CONTRACT.length) reject('introduction events missing');
	for (const [index, event] of value.events.entries()) {
		const [id, before, roles] = EVENT_CONTRACT[index];
		if (
			!object(event) ||
			!exactKeys(event, ['id', 'before', 'source', 'occurrences']) ||
			event.id !== id ||
			event.before !== before ||
			!nonempty(event.source) ||
			!Array.isArray(event.occurrences) ||
			event.occurrences.length !== roles.length
		)
			reject('invalid introduction event order or placement');
		for (const [position, occurrence] of event.occurrences.entries()) {
			const role = roles[position];
			if (!object(occurrence)) reject('invalid introduction occurrence');
			if (role === 'announcement') {
				if (
					!exactKeys(occurrence, ['slot', 'lecta', 'cantu']) ||
					occurrence.slot !== 'announcement'
				)
					reject('invalid introduction announcement slot');
			} else if (
				!exactKeys(occurrence, ['unit', 'lecta', 'cantu']) ||
				!nonempty(occurrence.unit) ||
				units.get(occurrence.unit)?.role !== role
			)
				reject('invalid introduction occurrence role');
			delivery(occurrence, role, id === 'epistola-annuntiatio' ? 'clara' : 'cantus');
		}
	}
	const passion = value.passion;
	const passionUnits = expectedUnits.filter((id) => id.startsWith('passio-'));
	if (
		!object(passion) ||
		!exactKeys(passion, ['units', 'omitted_events', 'omitted_units', 'lecta', 'cantu', 'source']) ||
		!same(passion.units, passionUnits) ||
		!same(passion.omitted_events, ['evangelium-salutatio']) ||
		!same(passion.omitted_units, ['responsio-gloria-tibi']) ||
		!nonempty(passion.source)
	)
		reject('invalid passion rule');
	delivery(passion, 'announcement', 'cantus');
	const announcements = new Map<string, AnnouncementBinding>();
	for (const row of value.announcements) {
		if (
			!object(row) ||
			Object.keys(row).some(
				(k) =>
					![
						'reading',
						'unit',
						'reference',
						'pericope',
						'misprint',
						'book_supplied',
						'reference_uncertain'
					].includes(k)
			) ||
			!nonempty(row.reading) ||
			!knownTexts.has(row.reading) ||
			announcements.has(row.reading) ||
			!nonempty(row.unit) ||
			units.get(row.unit)?.role !== 'announcement' ||
			!nonempty(row.reference) ||
			['book_supplied', 'misprint', 'reference_uncertain'].some(
				(k) => k in row && row[k] !== true
			) ||
			(row.reference_uncertain === true && row.misprint === true)
		)
			reject('invalid announcement binding');
		const wanted = row.unit.startsWith('lectio-') ? 'epistola' : 'evangelium';
		const pericope = row.pericope;
		if (
			readingRoles.get(row.reading) !== wanted ||
			!object(pericope) ||
			!exactKeys(pericope, ['book', 'passages']) ||
			!nonempty(pericope.book) ||
			!ANNOUNCEMENT_BOOKS[row.unit]?.includes(pericope.book) ||
			!Array.isArray(pericope.passages) ||
			!pericope.passages.length
		)
			reject('invalid announcement role or book');
		for (const passage of pericope.passages) {
			if (
				!object(passage) ||
				!exactKeys(passage, ['chapter', 'verses']) ||
				!positive(passage.chapter) ||
				!Array.isArray(passage.verses) ||
				!passage.verses.length ||
				passage.verses.some(
					(range) =>
						!Array.isArray(range) ||
						range.length !== 2 ||
						!positive(range[0]) ||
						!positive(range[1]) ||
						range[0] > range[1]
				)
			)
				reject('invalid announcement pericope');
		}
		announcements.set(row.reading, row as unknown as AnnouncementBinding);
	}
	if (!same([...announcements.keys()], [...readingRoles.keys()].sort()))
		reject('announcements missing or out of order');
	return {
		units,
		events: value.events as IntroductionEvent[],
		passion: passion as unknown as PassionRule,
		announcements
	};
}
