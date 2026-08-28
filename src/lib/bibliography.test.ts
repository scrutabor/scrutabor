import { describe, expect, test } from 'vitest';
import { buildBibliography, loadBibliographySource } from './bibliography';
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

	test('contains no empty or duplicated source records', async () => {
		for (const lang of ['pl', 'en'] as const) {
			const bibliography = await buildBibliography(lang);
			expect(bibliography.sourceCount).toBeGreaterThan(0);
			for (const section of bibliography.sections) {
				const ids = section.sources.map(({ id }) => id);
				expect(new Set(ids).size).toBe(ids.length);
				for (const source of section.sources) {
					expect(source.roles.length).toBeGreaterThan(0);
					expect(source.textCount).toBeGreaterThan(0);
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
});
