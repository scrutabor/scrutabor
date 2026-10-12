import { describe, expect, it } from 'vitest';
import { loadAllCoreTexts } from './corpus';
import { dayOn } from './kalendarium';
import { ORDO } from './ordo';
import { resolveOrdoChoice } from './ordo-choice';
import { componentApplies, dayById } from './proprium';

const texts = await loadAllCoreTexts();
const entry = (id: string) =>
	ORDO.flatMap((movement) => movement.entries).find((e) => e.id === id)!;
const plain = (value: string | undefined) => (value ?? '').replace(/\s+/g, ' ');

// MR1962 RG425/427/428 and RitusVII6 distinguish a temporal Mass from
// another Mass within the same dates. The Ordo opening distinguishes the
// initial Introibo from its repetition after Psalm42.
describe('the three omission notes keep the actual Mass and inclusive endpoint', () => {
	for (const id of ['iudica-me', 'introitus', 'lavabo']) {
		for (const language of ['pl', 'en'] as const) {
			it(`${id} ${language} qualifies the Mass, not just its season`, () => {
				const when = plain(entry(id).when?.[language]);
				expect(when).toContain('(de Tempore)');
				if (language === 'pl') {
					expect(when).toMatch(/Mszach okresowych/);
					expect(when).toContain('Mszach za zmarłych');
					expect(when).toContain('od I Niedzieli Męki Pańskiej do Wielkiego Czwartku włącznie');
				} else {
					expect(when).toContain('Masses of the season');
					expect(when).toContain('Masses for the Dead');
					expect(when).toContain(
						'from the First Sunday of the Passion through Holy Thursday inclusive'
					);
				}
			});
		}
	}

	it.each([
		[
			'pl',
			'Introit — antyfonę na wejście z wersetem psalmu, zwykle także z Glória Patri, po czym powtarza antyfonę.'
		],
		[
			'en',
			'Introit antiphon with its psalm verse, usually also the Glória Patri, then repeats the antiphon.'
		]
	] as const)('the %s Introit note makes only its doxology usual', (language, ending) => {
		expect(plain(entry('introitus').note[language])).toContain(ending);
	});

	// Ritus XIII.1: in Masses for the Dead the cross is over the book,
	// not over the celebrant. The short general reading note gives no gesture.
	it.each(['pl', 'en'] as const)(
		'the general %s Introit note does not require self-signing at every Mass',
		(language) => {
			const note = plain(entry('introitus').note[language]);
			expect(note).toMatch(
				language === 'pl'
					? /^Kapłan po stronie lekcji czyta Introit —/
					: /^At the Epistle side, the priest reads the Introit antiphon/
			);
			expect(note).not.toMatch(/żegna się|signs himself/);
		}
	);

	it.each(['pl', 'en'] as const)('%s Iudica names only the repeated antiphon', (language) => {
		const when = plain(entry('iudica-me').when?.[language]);
		expect(when).toContain(
			language === 'pl'
				? 'wraz z doksologią i powtórzoną antyfoną'
				: 'with its doxology and the repeated antiphon'
		);
		expect(when).not.toMatch(/(wszystkimi modlitwami|all the prayers)/);
	});

	it.each(['pl', 'en'] as const)(
		'%s distinguishes no Vigil Introit from retained Vigil Lavabo doxology',
		(language) => {
			expect(plain(entry('introitus').when?.[language])).toContain(
				language === 'pl'
					? 'W Wigilię Paschalną nie ma Introitu.'
					: 'There is no Introit at the Easter Vigil'
			);
			expect(plain(entry('lavabo').when?.[language])).toContain(
				language === 'pl'
					? 'W Wigilię Paschalną odmawia się Chwała Ojcu.'
					: 'It is said at the Easter Vigil'
			);
		}
	);
});

describe('source-correct controls use the actual calendar occurrence and text', () => {
	it('All Souls selects a supported Mass for the Dead with the common Requiem Introit', () => {
		const choice = resolveOrdoChoice('2026-11-02')!;
		expect(dayOn(choice.date)?.formulary).toBe('commemoratio-omnium-fidelium-defunctorum');
		expect(choice.mass).toBe('commemoratio-omnium-fidelium-defunctorum');
		const mass = dayById(choice.mass!)!;
		expect(mass.components.filter((component) => component.role === 'introitus')).toEqual([
			expect.objectContaining({
				text: 'proprium/commemoratio-omnium-fidelium-defunctorum-missa-i-introitus'
			})
		]);
	});

	it.each([
		['2026-03-22', 'dominica-i-passionis', 'passionis'],
		['2026-03-25', 'annuntiatio-beatae-mariae-virginis', 'passionis'],
		['2026-03-29', 'dominica-ii-passionis', 'passionis'],
		['2026-04-02', 'feria-v-in-cena-domini', 'passionis'],
		['2026-04-04', 'vigilia-paschalis', 'paschale']
	])('%s actually names %s in %s', (date, mass, season) => {
		expect(dayOn(date)?.formulary).toBe(mass);
		expect(dayOn(date)?.season).toBe(season);
		expect(resolveOrdoChoice(date)?.mass).toBe(mass);
	});

	it('a saint Mass in Passiontide selects the non-Paschal Introit WITH Gloria Patri', () => {
		const saint = dayById('annuntiatio-beatae-mariae-virginis')!;
		expect(saint.collection).toBe('sanctorale');
		const components = saint.components.filter(
			(p) => p.role === 'introitus' && componentApplies(p.condition, '2026-03-25')
		);
		expect(components).toHaveLength(1);
		expect(components[0].text).toBe(
			'proprium/annuntiatio-beatae-mariae-virginis-extra-tempus-paschale-introitus'
		);
		const words = texts[components[0].text].segments
			.flatMap((s) => s.words ?? [])
			.map((w) => w.form);
		expect(words.join(' ')).toContain('Glória Patri');
		expect(words.filter((w) => w === 'Vultum')).toHaveLength(2);
	});

	it('Palm Introit remains without a doxology, with its psalm verse and repeated antiphon', () => {
		const words = texts['proprium/dominica-ii-passionis-introitus'].segments
			.flatMap((s) => s.words ?? [])
			.map((w) => w.form);
		expect(words.join(' ')).not.toContain('Glória Patri');
		expect(words.join(' ')).toContain('Deus Deus meus');
		expect(words.filter((w) => w === 'Dómine')).toHaveLength(2);
	});

	it('the Vigil has no Introit component, not a fabricated Introit without doxology', () => {
		const vigil = dayById('vigilia-paschalis')!;
		expect(vigil.components.filter((p) => p.role === 'introitus')).toHaveLength(0);
	});

	it('the Lavabo reference text retains the two-part doxology needed at the Vigil', () => {
		const lavabo = texts['ordinarium/lavabo'];
		const verse = (id: string) =>
			lavabo.segments
				.find((s) => s.id === id)!
				.words!.map((w) => w.form)
				.join(' ');
		expect(verse('s09')).toBe('Glória Patri et Fílio et Spirítui Sancto');
		expect(verse('s10')).toContain('Sicut erat in princípio');
		expect(verse('s10')).toContain('sǽcula sæculórum Amen');
	});
});
