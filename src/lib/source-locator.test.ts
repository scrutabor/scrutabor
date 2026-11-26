import { describe, expect, it } from 'vitest';
import { formatSourceLocator, sourcePassageLink, sourcePassageNote } from './source-locator';

describe('source locators', () => {
	it('keeps the source file and localizes single lines and ranges', () => {
		const url = 'https://example.org/blob/commit/web/www/missa/Latin/Sancti/02-22.txt#L52-L53';
		const passage = { heading: 'Graduale', url };
		expect(sourcePassageLink(passage, 'pl')).toEqual({
			label: 'Graduale · Missa/Sancti/02-22.txt · w. 52–53',
			url
		});
		expect(sourcePassageLink(passage, 'en').label).toBe(
			'Graduale · Missa/Sancti/02-22.txt · lines 52–53'
		);
		const office = {
			heading: 'Gloria Patri',
			url: url.replace('/missa/', '/horas/').replace('#L52-L53', '#L13')
		};
		expect(sourcePassageLink(office, 'en').label).toBe(
			'Gloria Patri · Horae/Sancti/02-22.txt · line 13'
		);
	});

	it('distinguishes a prayer and its abbreviated ending from the pages supplying that ending', () => {
		const raw =
			'Proper body and abbreviated conclusion cue; full ending supplied from the printed formulae on pp. 123 and 226 under RG 115 a · p. 43 · leaf n122 / PDF p. 123';
		expect(formatSourceLocator(raw, 'pl')).toBe(
			'Tekst własny modlitwy i\u00a0skrót jej zakończenia; pełne zakończenie uzupełniono według formuł drukowanych na s. 123 i\u00a0226, zgodnie z\u00a0RG 115 a · s. 43 · obraz n122 / PDF, s. 123'
		);
		expect(formatSourceLocator(raw, 'en')).toContain(
			'The full ending comes from the formulas printed on pp. 123 and 226, following RG 115 a'
		);
	});

	it('distinguishes the archived Mass file from the Hours file with the same name', () => {
		const base = 'https://example.org/blob/revision/';
		const archived = {
			heading: 'Communio',
			url: base + 'obsolete/missa/Latin/Commune/C10a.txt#L47-L49'
		};
		const office = {
			heading: 'Communio',
			url: base + 'web/www/horas/Latin/Commune/C10a.txt#L39-L41'
		};
		expect(sourcePassageLink(archived, 'pl')).toEqual({
			url: archived.url,
			label: 'Communio · obsolete/missa/Latin/Commune/C10a.txt · w. 47–49'
		});
		expect(sourcePassageLink(archived, 'en').label).toBe(
			'Communio · obsolete/missa/Latin/Commune/C10a.txt · lines 47–49'
		);
		expect(sourcePassageLink(office, 'pl').label).toBe(
			'Communio · Horae/Commune/C10a.txt · w. 39–41'
		);
		expect(sourcePassageLink(office, 'en').label).toBe(
			'Communio · Horae/Commune/C10a.txt · lines 39–41'
		);
	});

	it('explains which file supplies the Communion and how the February Gradual is selected', () => {
		for (const lang of ['pl', 'en'] as const) {
			expect(sourcePassageNote('The Communion in the archived Marian Common.', lang)).toContain(
				'Ecce, Virgo'
			);
			expect(
				sourcePassageNote('In Cathedra S. Petri. Gradual in the Tractus section.', lang)
			).toContain('Tractus');
			expect(sourcePassageNote('Praefatio de beata Maria Virgine · Festivitáte', lang)).toContain(
				'Festivitáte'
			);
		}
	});

	it('keeps dictionary IDs, leaf IDs and physical page numbers distinct', () => {
		expect(formatSourceLocator('Perseus TEI entry n12345', 'pl')).toBe(
			'hasło TEI w\u00a0zbiorze Perseus: n12345'
		);
		expect(formatSourceLocator('Physical PDF pages 36 and 75 (one-based)', 'pl')).toBe(
			'strony w\u00a0pliku PDF (numeracja od 1): 36 i\u00a075'
		);
		expect(formatSourceLocator('Internet Archive BookReader leaves n579–n580', 'pl')).toBe(
			'obrazy w\u00a0Internet Archive BookReader: n579–n580'
		);
		expect(formatSourceLocator('PDF pages 60 (one-based); indices 59 (zero-based)', 'en')).toBe(
			'PDF page 60 (counting from 1); image index 59 (counting from 0)'
		);
		expect(formatSourceLocator('druk. s. 139', 'en')).toBe('printed p. 139');
		for (const native of ['druk. s. 10 · PDF s. 12', 'druk. ss. 182–185 · DjVu ss. 196–199']) {
			expect(formatSourceLocator(native, 'pl')).toBe(native);
		}
		expect(formatSourceLocator('Graduale starts21', 'en')).toBe('Graduale starts on line 21');
	});

	it('formats all members of a prayer-level list and keeps original bibliographic headings', () => {
		expect(formatSourceLocator('printed p. 117; printed pp. 182–185', 'pl')).toBe(
			'wyd. drukowane, s. 117; wyd. drukowane, s. 182–185'
		);
		const teDeum = {
			pl: 'Dodatek, część A. Modlitwy wspólne · Te Deum',
			en: 'Appendix, part A. Common prayers · Te Deum'
		};
		for (const lang of ['pl', 'en'] as const) {
			expect(formatSourceLocator('APPENDIX / A) COMMON PRAYERS / Te Deum', lang)).toBe(
				teDeum[lang]
			);
			expect(formatSourceLocator('Nova canticorum editio · tabula IV', lang)).toBe(
				'Nova canticorum editio · tabula IV'
			);
		}
	});

	it('binds Polish prose while preserving original source names and identifiers', () => {
		const file = 'web/www/missa/Latin/Ordo/Ordo.txt';
		for (const id of ['[A book w notes]', '{title: a book; w notes}']) {
			const raw = `${file} ${id} (lines 14-15); complete source contexts 37–45`;
			expect(formatSourceLocator(raw, 'pl')).toBe(
				`${file} ${id} (w. 14-15); pełny kontekst w\u00a0źródle: 37–45`
			);
		}
		const title = 'A book with a subtitle';
		expect(formatSourceLocator(title, 'pl')).toBe(title);
		const rites =
			'Orémus, Aufer a nobis and Orámus te, including their conclusions, on the left half of physical PDF page 173';
		expect(formatSourceLocator(rites, 'en')).toBe(rites);
		expect(formatSourceLocator(rites, 'pl')).toBe(
			'Orémus, Aufer a nobis i\u00a0Orámus te wraz z\u00a0ich zakończeniami, na lewej połowie strony 173 w\u00a0pliku PDF'
		);
	});

	it('preserves paths, bracketed section names and semicolons within source identifiers', () => {
		const file = 'web/www/missa/Latin/Ordo/Ordo.txt';
		const key = '{main-ordo:main-ordo-ordinarium-kyrie; closed-literal-selection}';
		expect(
			formatSourceLocator(`${file} ${key} (line 39; line 40); complete source contexts 37–45`, 'pl')
		).toBe(`${file} ${key} (w. 39; w. 40); pełny kontekst w\u00a0źródle: 37–45`);
		expect(
			formatSourceLocator('web/www/missa/Latin/Sancti/01-01.txt [Oratio] (lines 14-15)', 'pl')
		).toBe('web/www/missa/Latin/Sancti/01-01.txt [Oratio] (w. 14-15)');
	});
});
