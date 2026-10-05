import { describe, expect, test } from 'vitest';
import {
	buildBibliography,
	loadBibliographySource,
	loadTextBibliography,
	loadLemmaBibliography
} from './bibliography';
import { loadedTextKeys } from './corpus';

describe('the reader-facing bibliography', () => {
	test('publishes only audited sources and groups them by function', async () => {
		const bibliography = await buildBibliography('pl');
		expect(bibliography.sections.map(({ id }) => id)).toEqual([
			'latin_textual_sources',
			'wording_witnesses',
			'official_documents_and_liturgical_history',
			'scripture_language_and_scholarship'
		]);
		const titles = bibliography.sections.flatMap(({ sources }) =>
			sources.map(({ title }) => title)
		);
		expect(titles).toContain('Breviarium Romanum ex decreto SS. Concilii Tridentini restitutum');
		expect(titles).toContain('Gazeta Kościelna, R. 9, nr 16');
		expect(titles).not.toContain('Powściągliwość i Praca (1912)');
		expect(titles.join(' ')).not.toContain('De musica sacra et sacra liturgia');
	});

	test('loads the exact evidence only when a source is opened', async () => {
		const loadedBefore = loadedTextKeys();
		const bibliography = await buildBibliography('pl');
		expect(loadedTextKeys()).toEqual(loadedBefore);
		const source = bibliography.sections
			.find(({ id }) => id === 'wording_witnesses')!
			.sources.find(({ title }) => title === 'Gazeta Kościelna, R. 9, nr 16')!;
		const details = await loadBibliographySource('pl', source);
		expect(loadedTextKeys()).toEqual(loadedBefore);

		expect(details).toHaveLength(1);
		expect(details[0]).toMatchObject({
			role: 'historical_wording_basis',
			printed: 'druk. s. 167',
			scan: 'PDF s. 3',
			repository: 'Jagiellońska Biblioteka Cyfrowa'
		});
		expect(details[0].url).toContain('/edition/913560/');
		expect(details[0].uses).toEqual([
			{
				key: 'orationes.angelus-domini:s07:s08',
				title: 'Anioł Pański',
				href: '/app/pl/orationes/angelus-domini?s=s07-s08',
				kind: 'range',
				first: 7,
				last: 8
			}
		]);
	});

	test.each(['pl', 'en'] as const)(
		'links word-specific evidence to the word card in %s',
		async (lang) => {
			const loadedBefore = loadedTextKeys();
			const bibliography = await buildBibliography(lang);
			const source = bibliography.sections
				.flatMap(({ sources }) => sources)
				.find(({ id }) => id === 'edition.catechismus-catholicae-ecclesiae.latin-1997')!;
			const details = await loadBibliographySource(lang, source);
			const wordEvidence = details.filter(({ uses }) => uses.some(({ kind }) => kind === 'word'));
			expect(wordEvidence).toHaveLength(1);
			expect(wordEvidence[0]).toMatchObject({ section: '2851, 2854' });
			expect(wordEvidence[0].uses).toEqual([
				expect.objectContaining({
					kind: 'word',
					href: `/app/${lang}/orationes/pater-noster?w=w049`
				}),
				expect.objectContaining({
					kind: 'word',
					href: `/app/${lang}/ordinarium/pater-noster?w=w059`
				})
			]);
			expect(loadedTextKeys()).toEqual(loadedBefore);
		}
	);

	test.each(['pl', 'en'] as const)(
		'keeps Catechism lemma references separate from prayer evidence in %s',
		async (lang) => {
			const bibliography = await buildBibliography(lang);
			const source = bibliography.sections
				.find(({ id }) => id === 'official_documents_and_liturgical_history')!
				.sources.find(({ id }) => id === 'edition.catechismus-catholicae-ecclesiae.latin-1997')!;
			const details = await loadBibliographySource(lang, source);
			const lemmaEvidence = details.filter(({ uses }) => uses.some(({ kind }) => kind === 'lemma'));
			expect(lemmaEvidence).toHaveLength(2);
			for (const [lemma, section] of [
				['Iesus', '430'],
				['Christus', '436']
			]) {
				const groups = lemmaEvidence.filter((group) => group.section === section);
				expect(groups).toHaveLength(1);
				expect(groups[0]).toMatchObject({
					role: 'official_liturgical_context',
					url: 'https://www.vatican.va/archive/catechism_lt/p1s2c2a2_lt.htm',
					uses: [
						{
							key: `lemma:${lemma}`,
							title: lemma,
							href: `/app/${lang}/lemma?l=${lemma}`,
							kind: 'lemma'
						}
					]
				});
				const sources = await loadLemmaBibliography(lang, lemma);
				expect(sources).toContainEqual({
					title: source.title,
					locator: section,
					url: 'https://www.vatican.va/archive/catechism_lt/p1s2c2a2_lt.htm'
				});
			}
			const prayerEvidence = await loadTextBibliography(lang, 'orationes/pater-noster');
			const catechism = prayerEvidence.context.filter(({ title }) => title === source.title);
			expect(catechism).toHaveLength(1);
			expect(catechism[0].locator).toBe('2851, 2854');
		}
	);

	test('contains no empty or duplicated source records', async () => {
		for (const lang of ['pl', 'en'] as const) {
			const bibliography = await buildBibliography(lang);
			expect(bibliography.sourceCount).toBeGreaterThan(0);
			for (const section of bibliography.sections) {
				const ids = section.sources.map(({ id }) => id);
				expect(new Set(ids).size).toBe(ids.length);
				for (const source of section.sources) {
					expect(source.roles.length).toBeGreaterThan(0);
					expect(source.textCount + source.lemmaCount).toBeGreaterThan(0);
					expect(source.useCount).toBeGreaterThan(0);
					const details = await loadBibliographySource(lang, source);
					expect(details.length).toBeGreaterThan(0);
					for (const detail of details) {
						expect(detail.uses.length).toBeGreaterThan(0);
						expect(new Set(detail.uses.map(({ key }) => key)).size).toBe(detail.uses.length);
					}
				}
			}
		}
	});

	test.each(['pl', 'en'] as const)(
		'keeps dictionary evidence distinct from text evidence in %s',
		async (lang) => {
			const bibliography = await buildBibliography(lang);
			const source = bibliography.sections
				.flatMap(({ sources }) => sources)
				.find(({ id }) => id === 'edition.lewis-short.1879')!;
			expect(source.textCount).toBe(0);
			expect(source.lemmaCount).toBeGreaterThan(0);
			const details = await loadBibliographySource(lang, source);
			expect(details.flatMap(({ uses }) => uses)).toContainEqual({
				key: 'lemma:immortalitas',
				title: 'immortalitas',
				href: `/app/${lang}/lemma?l=immortalitas`,
				kind: 'lemma'
			});
			const sources = await loadLemmaBibliography(lang, 'immortalitas');
			expect(sources).toContainEqual(
				expect.objectContaining({
					title: 'A Latin Dictionary',
					locator: 'Perseus TEI entry n21759'
				})
			);
			expect(await loadLemmaBibliography(lang, 'not-a-dictionary-entry')).toEqual([]);
		}
	);

	test('gives reading surfaces only the verified evidence for their exact text', async () => {
		const rejected = await loadTextBibliography('pl', 'ordinarium/te-igitur');
		expect(rejected.translation).toEqual([]);

		const accepted = await loadTextBibliography('pl', 'ordinarium/gloria');
		expect(accepted.translation).toContainEqual(
			expect.objectContaining({ title: 'Pamiątka Missyi dla ludu katolickiego' })
		);
	});
});
