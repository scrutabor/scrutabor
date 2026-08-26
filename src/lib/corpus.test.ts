// Consistency of the vendored reader edition (src/lib/data). The corpus repo
// runs the authoritative round-trip checks; these assertions protect the
// application's package boundary and fail if a partial language pack is
// internally incomplete.
import { describe, expect, it } from 'vitest';
import {
	LEXICON,
	loadAllCoreTexts,
	loadAllTexts,
	loadSenses,
	textKeysFor,
	type TextDocument,
	type TextEntry
} from './corpus';
import { LANGS, type Lang } from './i18n';
import manifest from './data/manifest.json';

const LANGUAGES = LANGS;
const CORE = await loadAllCoreTexts();
const TEXTS = Object.fromEntries(
	await Promise.all(LANGUAGES.map(async (language) => [language, await loadAllTexts(language)]))
) as Record<Lang, Record<string, TextEntry>>;
const SENSES = Object.fromEntries(
	await Promise.all(LANGUAGES.map(async (language) => [language, await loadSenses(language)]))
) as Record<Lang, Awaited<ReturnType<typeof loadSenses>>>;

const allWords = (text: TextDocument) => text.segments.flatMap((segment) => segment.words ?? []);

// The app renders cross-references as „form” (wNNN) / “form” (wNNN) links.
const XREF = /[„“]([^”“„]+)”\s*\((w\d{3})\)/g;

describe('vendored corpus snapshot', () => {
	it('has at least the four launch texts in the neutral base', () => {
		expect(Object.keys(CORE).length).toBeGreaterThanOrEqual(4);
	});

	it('loads exactly the texts declared by each independent language manifest', () => {
		for (const language of LANGUAGES) {
			expect(Object.keys(TEXTS[language]).sort()).toEqual([...textKeysFor(language)].sort());
		}
	});

	it('carries one schema version across the base and every installed layer', () => {
		const versions = new Set<string>([manifest.corpus_schema]);
		for (const text of Object.values(CORE)) versions.add(text.schema_version);
		for (const language of LANGUAGES) {
			for (const entry of Object.values(TEXTS[language])) versions.add(entry.gloss.schema_version);
		}
		expect([...versions]).toHaveLength(1);
	});

	it('has unique word ids within every base text', () => {
		for (const [key, text] of Object.entries(CORE)) {
			const ids = allWords(text).map((word) => word.id);
			expect(new Set(ids).size, key).toBe(ids.length);
		}
	});

	it('has a neutral lemma and a localized sense for every word a pack exposes', () => {
		for (const language of LANGUAGES) {
			for (const [key, { text }] of Object.entries(TEXTS[language])) {
				for (const word of allWords(text)) {
					expect(
						LEXICON.lemmata[word.lemma],
						`${key}:${word.id} lemma ${word.lemma}`
					).toBeDefined();
					expect(
						SENSES[language][word.lemma],
						`${language} senses for ${word.lemma}`
					).toBeDefined();
				}
			}
		}
	});

	it('allows language lexicons to cover only the texts present in their package', () => {
		for (const language of LANGUAGES) {
			const required = new Set(
				Object.values(TEXTS[language]).flatMap(({ text }) =>
					allWords(text).map((word) => word.lemma)
				)
			);
			for (const lemma of required)
				expect(SENSES[language][lemma], `${language}:${lemma}`).toBeDefined();
			expect(Object.keys(SENSES[language]).every((lemma) => lemma in LEXICON.lemmata)).toBe(true);
		}
	});

	it('fully glosses every word in every included language text', () => {
		for (const language of LANGUAGES) {
			for (const [key, entry] of Object.entries(TEXTS[language])) {
				const ids = allWords(entry.text).map((word) => word.id);
				expect(Object.keys(entry.gloss.words).sort(), `${key} ${language}`).toEqual(
					[...ids].sort()
				);
				for (const id of ids)
					expect(entry.gloss.words[id].gloss, `${key} ${language} ${id}`).toBeTruthy();
				expect(entry.gloss.lang).toBe(language);
			}
		}
	});

	it('keeps shared annotation topology aligned where two packs include the same text', () => {
		for (const key of textKeysFor('pl').filter((candidate) => candidate in TEXTS.en)) {
			const withField = (language: Lang, field: 'explanation' | 'note') =>
				Object.entries(TEXTS[language][key].gloss.words)
					.filter(([, entry]) => field in entry)
					.map(([id]) => id)
					.sort();
			expect(withField('pl', 'explanation'), key).toEqual(withField('en', 'explanation'));
			expect(withField('pl', 'note'), key).toEqual(withField('en', 'note'));
		}
	});

	it('keeps routine grammar out of contextual explanations', () => {
		const words = TEXTS.pl['orationes/ave-regina-caelorum'].gloss.words;
		expect(words.w002.gloss).toBe('Królowo');
		expect(words.w002.explanation).toBeUndefined();
		expect(words.w003.explanation).toBeUndefined();
		expect(words.w005.explanation).toBeUndefined();
		expect(words.w008.explanation).toContain('zbawcze Światło — Chrystus');
	});

	it('expands the word-level editorial-note channel', () => {
		let carried = 0;
		for (const language of LANGUAGES) {
			for (const entry of Object.values(TEXTS[language])) {
				carried += Object.values(entry.gloss.words).filter(
					(word) => typeof word.note === 'string' && word.note.length > 0
				).length;
			}
		}
		expect(carried).toBeGreaterThan(0);
		expect(TEXTS.pl['orationes/pater-noster'].gloss.words.w049.note).toContain('malum');
	});

	it('keeps shared citations exact and attached to localized prose', () => {
		for (const key of textKeysFor('pl').filter((candidate) => candidate in TEXTS.en)) {
			const citations = (language: Lang) => {
				const gloss = TEXTS[language][key].gloss;
				return {
					about: gloss.about_citations,
					words: Object.fromEntries(
						Object.entries(gloss.words)
							.filter(([, entry]) => entry.explanation_citations)
							.map(([id, entry]) => [id, entry.explanation_citations])
					),
					segments: Object.fromEntries(
						Object.entries(gloss.segments)
							.filter(([, entry]) => entry.narrative_citations)
							.map(([id, entry]) => [id, entry.narrative_citations])
					)
				};
			};
			expect(citations('pl'), key).toEqual(citations('en'));

			for (const language of LANGUAGES) {
				const gloss = TEXTS[language][key].gloss;
				if (gloss.about_citations) expect(gloss.about, `${key} ${language} about`).toBeTruthy();
				for (const [id, entry] of Object.entries(gloss.words)) {
					if (entry.explanation_citations)
						expect(entry.explanation, `${key} ${language} ${id}`).toBeTruthy();
				}
				for (const [id, entry] of Object.entries(gloss.segments)) {
					if (entry.narrative_citations)
						expect(entry.narrative, `${key} ${language} ${id}`).toBeTruthy();
				}
			}
		}
	});

	it('resolves every localized cross-reference inside its base text', () => {
		for (const language of LANGUAGES) {
			for (const [key, entry] of Object.entries(TEXTS[language])) {
				const byId = new Map(allWords(entry.text).map((word) => [word.id, word]));
				for (const [id, wordGloss] of Object.entries(entry.gloss.words)) {
					for (const match of (wordGloss.explanation ?? '').matchAll(XREF)) {
						const [, quoted, ref] = match;
						const target = byId.get(ref);
						expect(target, `${key} ${language} ${id} → ${ref}`).toBeDefined();
						expect(quoted, `${key} ${language} ${id} → ${ref}`).toBe(target?.form);
					}
				}
			}
		}
	});
});
