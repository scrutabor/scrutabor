import { describe, expect, test } from 'vitest';
import { LEXICON, narrowLexicon, type TextDocument } from './corpus';
import { lemmataWithSupport, loadLemmaSupport } from './bibliography';

// The mark the page lexicon carries (LemmaEntry.sources) must name exactly
// the lemmata whose word card will show dictionary sources, on the real
// vendored index: the panel holds room for a sourced lemma's line from its
// first frame, and a wrong mark would either leave an empty room or let the
// late line grow the sheet over the tapped word.
describe('the sourced-lemma mark against the vendored bibliography', () => {
	test.each(['pl', 'en'] as const)(
		'equals the lemmata with dictionary support in %s',
		async (lang) => {
			const marked = await lemmataWithSupport(lang);
			const filled = new Set<string>();
			for (const lemma of Object.keys(LEXICON.lemmata)) {
				if ((await loadLemmaSupport(lang, lemma)).length) filled.add(lemma);
			}
			expect([...marked].sort()).toEqual([...filled].sort());
			expect(marked.size).toBeGreaterThan(0);
			expect(marked.size).toBeLessThan(Object.keys(LEXICON.lemmata).length / 2);
		}
	);

	test('narrowLexicon marks a sourced lemma and leaves the others and the shared lexicon alone', async () => {
		const marked = await lemmataWithSupport('en');
		const sourced = [...marked][0];
		const plain = Object.keys(LEXICON.lemmata).find((lemma) => !marked.has(lemma))!;
		const doc = {
			segments: [{ words: [{ lemma: sourced }, { lemma: plain }] }]
		} as unknown as TextDocument;
		const lex = await narrowLexicon([doc], 'en');
		expect(lex.lemmata[sourced].sources).toBe(true);
		expect(lex.lemmata[plain]).not.toHaveProperty('sources');
		expect(LEXICON.lemmata[sourced]).not.toHaveProperty('sources');
	});
});
