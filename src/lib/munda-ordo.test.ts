import { describe, expect, it } from 'vitest';
import { loadCoreText } from './corpus';
import { ordoData } from './loaders';
import { MASS_FORMS } from './mass-form.svelte';
import { ORDO, partVoice } from './ordo';
import { expectGospelPreparationOrder } from './ordo-test-context';
import { ordoContext } from './ordo-context';
import { bindOrphans } from './polish';
import { massesOn, resolveOrdoChoice } from './ordo-choice';
import { PROPER_DAYS, SLOT_OF } from './proprium';
import { inMassForm } from './speaker-marks';

const key = 'ordinarium/munda-cor-meum';
const movement = ORDO.find((item) => item.id === 'catechumenorum')!;
const munda = movement.entries.find((entry) => entry.id === 'munda-cor-meum');

describe('Munda before the Mass Gospel', () => {
	it('has exactly one fixed body after the complete chant slot and before the Gospel', () => {
		expectGospelPreparationOrder(movement);
		expect(ORDO.flatMap((item) => item.entries).filter((entry) => entry.text === key)).toEqual([
			munda
		]);
		expect(munda).toMatchObject({ kind: 'text', text: key });
	});

	it('keeps Gradual, Alleluia, Tract and Sequence ahead of the preparation', () => {
		for (const part of ['graduale', 'alleluia', 'tractus', 'sequentia'] as const)
			expect(SLOT_OF[part], part).toBe('graduale');
	});

	it('does not gate this fixed Ordinary on a proper-only component', () => {
		expect(munda).toBeDefined();
		expect(munda!.onlyWhenPresent).toBeUndefined();
		expect(PROPER_DAYS.length).toBeGreaterThan(100);
		expect(
			PROPER_DAYS.flatMap((day) => day.components).filter(
				(component) => String(component.role) === 'munda-cor-meum'
			)
		).toHaveLength(0);
	});

	it('does not invent a solemnity or deacon setting', () => {
		expect(MASS_FORMS).toEqual(['cantu', 'lecta']);
	});

	it('keeps the quiet priest-alone body unchanged between low and sung settings', async () => {
		const doc = await loadCoreText(key);
		expect(doc).toBeDefined();
		if (!doc) throw new Error('Munda body is missing');
		expect(doc.segments).toHaveLength(2);
		expect(doc.segments.map((segment) => segment.words?.length)).toEqual([29, 5]);
		expect(partVoice('munda-cor-meum')).toBe('secreto');
		for (const form of MASS_FORMS) {
			for (const segment of doc.segments) {
				expect(inMassForm(segment, form).speaker).toBe('sacerdos');
				expect(inMassForm(segment, form).voice).toBe('secreto');
			}
		}
	});

	it.each(['pl', 'en'] as const)('scopes the %s base and uses a neutral folded label', (lang) => {
		expect(munda!.quietLabel?.[lang]).toBe(
			lang === 'pl' ? 'przygotowanie do Ewangelii' : 'preparation for the Gospel'
		);
		const note = munda!.note[lang].replaceAll('\u00a0', ' ');
		for (const phrase of lang === 'pl'
			? [
					'bez diakona',
					'sam śpiewa',
					'mówi ją diakon',
					'celebrans jej nie powtarza',
					'Munda cor meum wraz ze swoim zakończeniem pozostaje',
					'przed ostatnią Ewangelią'
				]
			: [
					'priest-alone',
					'sings the Gospel himself',
					'the deacon says it',
					'celebrant does not repeat it',
					'Munda cor meum and its own conclusion remain',
					'before the Last Gospel'
				])
			expect(note).toContain(phrase);
	});

	it.each(['pl', 'en'] as const)(
		'gives Palm Passion its own %s minister and introduction rules',
		(lang) => {
			const note = ordoContext('munda-cor-meum', 'dominica-ii-passionis', false, lang)!;
			for (const phrase of lang === 'pl'
				? [
						'kapłan wykonuje Pasję sam',
						'co najmniej święcenia diakonatu',
						bindOrphans('każdy z nich'),
						'półgłosem',
						'Sam wybór Mszy śpiewanej nie rozstrzyga',
						'obrzędach palm ma osobne przygotowanie'
					]
				: [
						'priest delivers the Passion alone',
						'at least deacons',
						'each says Munda in a low voice',
						'Selecting sung Mass alone does not determine',
						'palm ceremonies has its own preparation'
					])
				expect(note).toContain(phrase);
			const gospel = ordoContext('evangelium', 'dominica-ii-passionis', false, lang)!;
			expect(gospel).toContain(
				lang === 'pl' ? 'Nie odmawia się Dominus vobiscum' : 'Dominus vobiscum is not said'
			);
			expect(gospel).toContain(
				lang === 'pl'
					? bindOrphans('ani nie znaczy krzyżem księgi i siebie')
					: 'neither the book nor the reader is signed'
			);
			expect(gospel).not.toContain(
				lang === 'pl' ? 'znaczy krzyżem księgę' : 'the priest signs the book'
			);
			expect(ordoContext('laus-tibi-christe', 'dominica-ii-passionis', false, lang)).toContain(
				lang === 'pl'
					? 'nie odpowiada się Laus tibi, Christe'
					: 'Laus tibi, Christe is not answered'
			);
		}
	);

	it.each(['pl', 'en'] as const)(
		'retains %s Vigil preparation without importing foot-prayer omissions',
		(lang) => {
			const note = ordoContext('munda-cor-meum', 'vigilia-paschalis', true, lang)!;
			expect(note).toContain(
				lang === 'pl'
					? 'zachowuje się Munda cor meum'
					: 'Munda cor meum and the separate blessing request and blessing remain'
			);
			expect(note).toContain(
				lang === 'pl'
					? 'Przy Ewangelii nie niesie się świateł, ale nie pomija się tego przygotowania.'
					: 'No lights are carried at the Gospel, but this preparation is not omitted.'
			);
			expect(note).not.toContain(lang === 'pl' ? 'opuszcza się Munda' : 'Munda is omitted');
			expect(ordoContext('introibo', 'vigilia-paschalis', true, lang)).toContain(
				lang === 'pl'
					? bindOrphans('opuszcza się modlitwy u stopni')
					: 'prayers at the foot of the altar'
			);
		}
	);

	it.each(['pl', 'en'] as const)(
		'does not leak Palm or Vigil %s context into other supported Masses',
		(lang) => {
			for (const mass of [null, ...PROPER_DAYS.map((day) => day.id)]) {
				if (mass === 'dominica-ii-passionis' || mass === 'vigilia-paschalis') continue;
				expect(ordoContext('munda-cor-meum', mass, false, lang), String(mass)).toBeUndefined();
			}
			for (const mass of [
				'commemoratio-omnium-fidelium-defunctorum',
				'commemoratio-omnium-fidelium-defunctorum-missa-ii',
				'commemoratio-omnium-fidelium-defunctorum-missa-iii',
				'feria-v-in-cena-domini'
			])
				expect(
					PROPER_DAYS.some((day) => day.id === mass),
					mass
				).toBe(true);
		}
	);

	it('does not fabricate unsupported Tuesday, Wednesday or Good-Friday Mass routes', () => {
		for (const date of ['2026-03-31', '2026-04-01', '2026-04-03']) {
			expect(massesOn(date), date).toHaveLength(0);
			expect(resolveOrdoChoice(date)?.mass, date).toBeNull();
			expect(resolveOrdoChoice(date, 'dominica-ii-passionis'), date).toBeNull();
		}
	});

	it('never adds a second Munda to the Last Gospel movement', () => {
		const ending = ORDO.find((item) => item.id === 'conclusio')!;
		expect(ending.entries.some((entry) => entry.id === 'evangelium-ultimum')).toBe(true);
		expect(ending.entries.some((entry) => entry.text === key)).toBe(false);
	});

	it.each(['pl', 'en'] as const)(
		'loads the fixed %s body and both new lemma cards with the movement',
		async (lang) => {
			const data = await ordoData(lang, 'catechumenorum');
			expect(data?.texts[key]).toBeDefined();
			expect(data?.lex.lemmata.calculus).toBeDefined();
			expect(data?.lex.lemmata.ignio).toBeDefined();
			expect(data?.lex.senses.calculus.senses.length).toBeGreaterThan(0);
			expect(data?.lex.senses.ignio.senses.length).toBeGreaterThan(0);
		}
	);
});
