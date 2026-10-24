import { readingLookup as lookup, readingSuiteFixture } from './reading-test-fixtures';
// Reading occurrences retain their exact owners and require settled assembly state.
import { describe, expect, it } from 'vitest';
import {
	announcedReadings,
	readingPayloadReady,
	type AnnouncementOwner
} from './reading-announcements';
import { indexOccurrenceWords } from './proper-occurrences';
import { resolveCompositeAddress } from './reading-address';

const PALM = 'proprium/dominica-ii-passionis-evangelium';

it('uses a settled, calendar-valid Mass and current language, not merely a nonempty body', () => {
	const healthy = {
		date: '2026-04-26',
		mass: 'dominica-iii-post-pascha',
		loadedMass: 'dominica-iii-post-pascha',
		loadedLanguage: 'en',
		loading: false,
		failed: false,
		unwritten: false
	};
	expect(readingPayloadReady(healthy, 'en')).toBe(true);
	for (const delta of [
		{ date: null },
		{ mass: null },
		{ loadedMass: null },
		{ loadedLanguage: null },
		{ loading: true },
		{ failed: true },
		{ unwritten: true },
		{ date: '2026-03-29' },
		{ loadedMass: 'dominica-in-albis' },
		{ loadedLanguage: 'pl' }
	])
		expect(readingPayloadReady({ ...healthy, ...delta }, 'en')).toBe(false);
	expect(readingPayloadReady({ ...healthy, loadedLanguage: 'pl' }, 'pl')).toBe(true);
});

describe.each(['pl', 'en'] as const)('%s occurrence and owner boundaries', (lang) => {
	const suite = readingSuiteFixture(lang);
	const reading = suite.reading;

	it.each(['sacerdos', 'schola'] as const)(
		'rejects one wrong legal Passion actor: %s',
		async (actor) => {
			const body = await reading(PALM);
			const broken = structuredClone(body);
			const verses = broken.doc.segments.filter((s) => s.type === 'verse');
			// Other verses still retain legal Passion speakers: the old any() predicate passes.
			verses[1].delivery!.cantu!.speaker = actor;
			expect(verses[0].delivery!.cantu!.speaker).toBe('chronista');
			expect(() => announcedReadings('evangelium', [broken], suite.owners, lookup)).toThrow(
				/delivery differ/
			);
			expect(() => announcedReadings('evangelium', [body], suite.owners, lookup)).not.toThrow();
		}
	);
	it('keeps two Passion occurrences, source owners, words and deep links distinct', async () => {
		const original = await reading(PALM);
		const repeated = await reading(PALM, '~evangelium');
		const result = announcedReadings('evangelium', [original, repeated], suite.owners, lookup);
		expect(result).toHaveLength(4);
		expect(new Set(result.map((r) => r.slug)).size).toBe(4);
		expect(new Set(result.map((r) => r.anchor)).size).toBe(4);
		const binding = lookup.announcements.get(PALM)!;
		const unit = lookup.units.get(binding.unit)!;
		for (const offset of [0, 2]) {
			const formula = result[offset];
			expect(formula.key).toBe(unit.text);
			expect(formula.doc.id).toBe(unit.text.replace('/', '.'));
			expect(formula.gloss).toBe(suite.owners[unit.text].gloss);
			expect(formula.bibliography).toBe(suite.owners[unit.text].bibliography);
			expect(formula.doc.segments[0].words).toEqual(
				suite.owners[unit.text].doc.segments.find((s) => s.id === unit.segment)!.words
			);
			expect(result[offset + 1].doc).toBe(offset === 0 ? original.doc : repeated.doc);
			expect(result[offset + 1].bibliography).toBe(
				offset === 0 ? original.bibliography : repeated.bibliography
			);
			expect(result[offset + 1].readingReference).toBe(binding.reference);
			const address = `${formula.slug}.${unit.words[0]}`;
			expect(indexOccurrenceWords(result).get(address)?.key).toBe(unit.text);
			expect(resolveCompositeAddress(result, address, null, '').word).toBe(address);
		}
		expect(original.doc).toEqual((await reading(PALM)).doc);
	});
	it('rejects ambiguous occurrence addresses rather than overwriting their words', async () => {
		const body = await reading(PALM);
		expect(() => announcedReadings('evangelium', [body, body], suite.owners, lookup)).toThrow(
			/duplicate reading occurrence/
		);
	});
	it('rejects a reading under another owner identity and a wrong-language formula owner', async () => {
		const body = await reading(PALM);
		const wrong = structuredClone(body);
		wrong.doc.id = 'proprium.dominica-in-albis-evangelium';
		expect(() => announcedReadings('evangelium', [wrong], suite.owners, lookup)).toThrow(
			/owner identity/
		);
		const key = lookup.units.get(lookup.announcements.get(PALM)!.unit)!.text;
		const mixed: Record<string, AnnouncementOwner> = {
			...suite.owners,
			[key]: {
				...suite.owners[key],
				gloss: { ...suite.owners[key].gloss, lang: lang === 'pl' ? 'en' : 'pl' }
			}
		};
		expect(() => announcedReadings('evangelium', [body], mixed, lookup)).toThrow(/owner language/);
	});
});
