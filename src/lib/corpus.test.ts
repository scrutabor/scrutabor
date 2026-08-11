// Consistency of the vendored corpus snapshot (src/lib/data). The corpus
// repo runs the authoritative checks; these mirror the ones a stale or
// partial vendor would break, so a bad snapshot fails CI here instead of
// surfacing at runtime. Drops away with the artifact pipeline.
import { describe, expect, it } from 'vitest';
import { LEXICON, TEXTS } from './corpus';
import lexiconEn from './data/lexicon.en.json';
import lexiconLemmata from './data/lexicon.json';
import lexiconPl from './data/lexicon.pl.json';

const allWords = (key: string) => TEXTS[key].text.segments.flatMap((s) => s.words ?? []);

const textKeys = Object.keys(TEXTS);

// The app renders cross-references as „form” (wNNN) / “form” (wNNN) links.
const XREF = /[„“]([^”“„]+)”\s*\((w\d{3})\)/g;

describe('vendored corpus snapshot', () => {
	it('has at least the four launch texts', () => {
		expect(textKeys.length).toBeGreaterThanOrEqual(4);
	});

	it('carries one schema version across every document', () => {
		const versions = new Set<string>([
			lexiconLemmata.schema_version,
			lexiconPl.schema_version,
			lexiconEn.schema_version
		]);
		for (const key of textKeys) {
			versions.add(TEXTS[key].text.schema_version);
			versions.add(TEXTS[key].glosses.pl.schema_version);
			versions.add(TEXTS[key].glosses.en.schema_version);
		}
		expect([...versions]).toHaveLength(1);
	});

	it('has unique word ids within every text', () => {
		for (const key of textKeys) {
			const ids = allWords(key).map((w) => w.id);
			expect(new Set(ids).size, key).toBe(ids.length);
		}
	});

	it('has a lexicon entry in every layer for every lemma', () => {
		for (const key of textKeys) {
			for (const w of allWords(key)) {
				expect(LEXICON.lemmata[w.lemma], `${key}:${w.id} lemma ${w.lemma}`).toBeDefined();
				expect(LEXICON.senses.pl[w.lemma], `pl senses for ${w.lemma}`).toBeDefined();
				expect(LEXICON.senses.en[w.lemma], `en senses for ${w.lemma}`).toBeDefined();
			}
		}
	});

	it('has identical lemma key sets across the three lexicon files', () => {
		const lemmata = Object.keys(LEXICON.lemmata).sort();
		expect(Object.keys(LEXICON.senses.pl).sort()).toEqual(lemmata);
		expect(Object.keys(LEXICON.senses.en).sort()).toEqual(lemmata);
	});

	it('glosses every word in both languages', () => {
		for (const key of textKeys) {
			const ids = allWords(key).map((w) => w.id);
			for (const lang of ['pl', 'en'] as const) {
				const gloss = TEXTS[key].glosses[lang];
				expect(Object.keys(gloss.words).sort(), `${key} ${lang}`).toEqual([...ids].sort());
				for (const id of ids) {
					expect(gloss.words[id].gloss, `${key} ${lang} ${id}`).toBeTruthy();
				}
			}
		}
	});

	it('keeps function-note presence in parity between languages', () => {
		for (const key of textKeys) {
			const withFn = (lang: 'pl' | 'en') =>
				Object.entries(TEXTS[key].glosses[lang].words)
					.filter(([, e]) => 'function' in e)
					.map(([id]) => id)
					.sort();
			expect(withFn('pl'), key).toEqual(withFn('en'));
		}
	});

	it('keeps reader-facing citations exact and attached to prose', () => {
		for (const key of textKeys) {
			const citations = (lang: 'pl' | 'en') => {
				const gloss = TEXTS[key].glosses[lang];
				return {
					about: gloss.about_citations,
					words: Object.fromEntries(
						Object.entries(gloss.words)
							.filter(([, entry]) => entry.function_citations)
							.map(([id, entry]) => [id, entry.function_citations])
					),
					segments: Object.fromEntries(
						Object.entries(gloss.segments)
							.filter(([, entry]) => entry.narrative_citations)
							.map(([id, entry]) => [id, entry.narrative_citations])
					)
				};
			};
			expect(citations('pl'), key).toEqual(citations('en'));

			for (const lang of ['pl', 'en'] as const) {
				const gloss = TEXTS[key].glosses[lang];
				if (gloss.about_citations) expect(gloss.about, `${key} ${lang} about`).toBeTruthy();
				for (const [id, entry] of Object.entries(gloss.words)) {
					if (entry.function_citations) expect(entry.function, `${key} ${lang} ${id}`).toBeTruthy();
				}
				for (const [id, entry] of Object.entries(gloss.segments)) {
					if (entry.narrative_citations)
						expect(entry.narrative, `${key} ${lang} ${id}`).toBeTruthy();
				}
			}
		}
	});

	it('resolves every cross-reference to a word whose form matches the quote', () => {
		for (const key of textKeys) {
			const byId = new Map(allWords(key).map((w) => [w.id, w]));
			for (const lang of ['pl', 'en'] as const) {
				for (const [id, entry] of Object.entries(TEXTS[key].glosses[lang].words)) {
					for (const match of (entry.function ?? '').matchAll(XREF)) {
						const [, quoted, ref] = match;
						const target = byId.get(ref);
						expect(target, `${key} ${lang} ${id} → ${ref}`).toBeDefined();
						expect(quoted, `${key} ${lang} ${id} → ${ref}`).toBe(target?.form);
					}
				}
			}
		}
	});
});
