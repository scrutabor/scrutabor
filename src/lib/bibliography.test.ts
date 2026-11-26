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
		expect(titles.join(' ')).not.toContain('Gazeta Kościelna');
		expect(titles).toContain('Droga do Nieba. Wyborek modlitw i pieśni');
		expect(titles.join(' ')).not.toContain('Powściągliwość i Praca');
		const documents = bibliography.sections.find(
			({ id }) => id === 'official_documents_and_liturgical_history'
		)!;
		expect(documents.sources.map(({ id }) => id)).toContain(
			'edition.sacra-rituum-congregatio.de-musica-sacra.1958-aas50'
		);
	});

	test.each(['pl', 'en'] as const)(
		'sets out the credits and publication dates in %s',
		async (lang) => {
			const sources = (await buildBibliography(lang)).sections.flatMap(
				(section) => section.sources
			);
			const meta = (id: string) => sources.find((source) => source.id === 'edition.' + id)!.meta;
			expect(
				meta('congregatio-cultus.litaniae-lauretanae.2020').join(' ').match(/2020/g)
			).toHaveLength(1);
			expect(meta('missale-romanum.1962-vatican-joseph-bearing')).toContain(
				lang === 'pl'
					? 'wydanie elektroniczne 4 października 2007'
					: 'electronic publication 4 October 2007'
			);
			expect(meta('enchiridion-indulgentiarum.1952-editio-altera')).toContain(
				lang === 'pl' ? 'reprodukcja cyfrowa 2023' : 'digital reproduction 2023'
			);
			const grammar = meta('allen-greenough.1903');
			expect(grammar.find((part) => part.includes('Kittredge'))).toMatch(
				lang === 'pl'
					? /^red\. J\. B\. Greenough,.*i Benj\. L\. D’Ooge$/
					: /^eds\. J\. B\. Greenough,.*and Benj\. L\. D’Ooge$/
			);
			expect(meta('thesaurus-precum-latinarum.sacratissimi-cordis-iesu')).toContain(
				lang === 'pl' ? 'wersja z 2026' : '2026 version'
			);
			if (lang === 'en') {
				expect(meta('blessed-be-god.princeton')).toContain('[not before 1952]');
				expect(meta('blessed-be-god-1925')).toContain('[1925]');
				expect(meta('douay-rheims-bible-challoner')).toContain('[not before 1924]');
				expect(meta('key-of-heaven-1901')).toContain('[1901–1906]');
				expect(meta('manual-of-prayers-catholic-laity-1888')).toContain(
					'ecclesiastical approval 17 May 1889'
				);
				expect(meta('manual-of-prayers-catholic-laity-1888')).toContain(
					'by order of the Third Plenary Council of Baltimore'
				);
			}
			if (lang === 'pl') {
				const catechism = meta('katechizm-religji-rzymsko-katolickiej-1925');
				expect(catechism).toContain('na karcie tytułowej 1925');
				expect(catechism).toContain('imprimatur 3 marca 1926');
				expect(meta('katolik-w-modlitwie-1902')).toContain(
					'Gliwice: Drukiem Teodora Zalewskiego (Fr. Feldhussa)'
				);
				expect(meta('siedlecki-spiewnik.1928-jubileuszowe')).toContain('1928');
			}
		}
	);

	test('loads the exact evidence only when a source is opened', async () => {
		const loadedBefore = loadedTextKeys();
		const bibliography = await buildBibliography('pl');
		expect(loadedTextKeys()).toEqual(loadedBefore);
		const source = bibliography.sections
			.find(({ id }) => id === 'wording_witnesses')!
			.sources.find(
				({ id }) => id === 'edition.konferencja-episkopatu-polski.uchwala-28-386.2020'
			)!;
		const details = await loadBibliographySource('pl', source);
		expect(loadedTextKeys()).toEqual(loadedBefore);

		expect(details).toHaveLength(6);
		const invocation = details.find(({ section }) => section?.endsWith('Królowo Polski'))!;
		expect(invocation).toMatchObject({
			role: 'historical_wording_comparator',
			printed: 's. 107',
			scan: 'PDF, s. 107',
			repository: 'Konferencja Episkopatu Polski'
		});
		expect(invocation.url).toMatch(/Akta_KEP_2020[.]pdf#page=107$/);
		expect(invocation.uses).toHaveLength(1);
		expect(invocation.uses[0].href).toBe('/app/pl/litaniae/lauretanae?s=s122');
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
			for (const [lemma, section, anchor] of [
				['Iesus', '430', 'I.%20Iesus'],
				['Christus', '436', 'II.%20Christus']
			]) {
				const groups = lemmaEvidence.filter((group) => group.section === section);
				const url = `https://www.vatican.va/archive/catechism_lt/p1s2c2a2_lt.htm#${anchor}`;
				expect(groups).toHaveLength(1);
				expect(groups[0]).toMatchObject({
					role: 'official_liturgical_context',
					url,
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
					url
				});
			}
			const prayerEvidence = await loadTextBibliography(lang, 'orationes/pater-noster');
			const catechism = prayerEvidence.context.filter(({ title }) => title === source.title);
			expect(catechism).toHaveLength(1);
			expect(catechism[0]).toMatchObject({
				locator: '2851, 2854',
				url: 'https://www.vatican.va/archive/catechism_lt/p4s2a3_lt.htm#VII.%20%C2%AB%20Sed%20libera%20nos%20a%20Malo%20%C2%BB'
			});
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
					locator: 's.v. immortalitas',
					url: 'https://atlas.perseus.tufts.edu/dictionaries/entry/urn%3Acite2%3Ascaife-viewer%3Adictionary-entries.atlas_v1%3Alat.ls.perseus-eng2-n21759/'
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
			expect.objectContaining({
				title: 'Pamiątka Missyi dla ludu katolickiego. Nauka dobrego korzystania z missyi św.',
				url: 'https://sbc.org.pl/Content/318796/PDF/Publikacja-KC-8251.pdf#page=49'
			})
		);
	});
});
