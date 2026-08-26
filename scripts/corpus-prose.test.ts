// The corpus's prose is the larger half of what a reader reads — about
// sheets, rubric narratives, and the word notes where this edition does most
// of its explaining — and it answers to the same rule as the app's own
// strings (src/lib/prose.test.ts). It lives here rather than under src/
// because it reads the vendored files, and node's types are not in the
// app's tsconfig.
//
// The verse TRANSLATIONS are exempt, and that is not an oversight: their
// punctuation belongs to the text being translated, not to this edition's
// voice, and the received wording the corpus aligned to is not ours to
// repunctuate.
import { readFileSync, readdirSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/** Every prose string the corpus puts on a page, except verse translations. */
function corpusProse(): { where: string; text: string }[] {
	const dir = 'src/lib/data';
	const out: { where: string; text: string }[] = [];
	const LANGS = ['pl', 'en'];
	const read = (path: string) => JSON.parse(readFileSync(`${dir}/${path}`, 'utf8'));

	// The LEXICON keeps its prose at entries[lemma].note, not words[id].note,
	// so this walk stepped past all 329 of them until 2026-08-16 — and the
	// lexicon is vendored and rendered, so every one reached a lemma page.
	const lexicon = read('lexicon.json');
	for (const lang of LANGS) {
		for (const [lemma, entry] of Object.entries(lexicon.senses[lang] ?? {}) as [
			string,
			Record<string, string>
		][]) {
			if (entry.note) out.push({ where: `lexicon.json:${lang}.${lemma}.note`, text: entry.note });
		}
	}

	// One document per text, and every prose value keyed by language: `about`
	// on the text, `nr` on a rubric segment, `fn` and `nt` on a word. The keys
	// are short because this is the reader edition — the shape the corpus
	// emits rather than the shape it stores.
	for (const category of readdirSync(`${dir}/texts`)) {
		for (const file of readdirSync(`${dir}/texts/${category}`)) {
			if (!file.endsWith('.json')) continue;
			const doc = read(`texts/${category}/${file}`);
			const at = (k: string) => `${category}/${file}:${k}`;
			const byLang = (value: unknown, where: string) => {
				for (const lang of LANGS) {
					const text = (value as Record<string, string> | undefined)?.[lang];
					if (text) out.push({ where: `${where}.${lang}`, text });
				}
			};
			byLang(doc.about, at('about'));
			for (const row of (doc.seg ?? []) as Record<string, unknown>[]) {
				byLang(row.nr, at(`${row.id}.narrative`));
				for (const key of ['fn', 'nt']) {
					for (const lang of LANGS) {
						const byWord = (row[key] as Record<string, Record<string, string>>)?.[lang] ?? {};
						for (const [id, text] of Object.entries(byWord)) {
							out.push({ where: at(`${id}.${key}.${lang}`), text });
						}
					}
				}
			}
		}
	}
	return out;
}

describe('the words the corpus says', () => {
	it('never reaches for a semicolon', () => {
		// 589 of these were rewritten on 2026-08-10, after the same sweep
		// through the app's own tables.
		const all = corpusProse();
		expect(all.length, 'the vendored prose is reachable').toBeGreaterThan(2000);
		const offenders = all
			.filter(({ text }) => text.includes(';'))
			.map(({ where, text }) => `${where}: ${text.slice(0, 60)}`);
		expect(offenders, `use a full stop or an "and":\n  ${offenders.join('\n  ')}`).toEqual([]);
	});
});
