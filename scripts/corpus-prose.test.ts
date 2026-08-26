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
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/** Every prose string the corpus puts on a page, except verse translations. */
function corpusProse(): { where: string; text: string }[] {
	const dir = 'src/lib/data';
	const out: { where: string; text: string }[] = [];
	const read = (path: string) => JSON.parse(readFileSync(`${dir}/${path}`, 'utf8'));
	const manifest = read('manifest.json') as {
		languages: { id: string; path: string }[];
	};

	// The LEXICON keeps its prose at entries[lemma].note, not words[id].note,
	// so this walk stepped past all 329 of them until 2026-08-16 — and the
	// lexicon is vendored and rendered, so every one reached a lemma page.
	for (const { id: lang, path: manifestPath } of manifest.languages) {
		const language = read(manifestPath) as {
			lexicon: string;
			texts: { id: string; path: string }[];
		};
		const lexicon = read(language.lexicon);
		for (const [lemma, entry] of Object.entries(lexicon.entries ?? {}) as [
			string,
			Record<string, string>
		][]) {
			if (entry.note)
				out.push({ where: `${language.lexicon}:${lang}.${lemma}.note`, text: entry.note });
		}

		// Each language text is self-contained: `about` on the artifact, `nr`
		// on a rubric row, and `fn` / `nt` keyed by stable word id.
		for (const text of language.texts) {
			const doc = read(text.path);
			const at = (key: string) => `${text.path}:${key}.${lang}`;
			if (doc.about) out.push({ where: at('about'), text: doc.about });
			for (const row of (doc.seg ?? []) as Record<string, unknown>[]) {
				if (row.nr) out.push({ where: at(`${row.id}.narrative`), text: row.nr as string });
				for (const key of ['fn', 'nt']) {
					const byWord = (row[key] as Record<string, string>) ?? {};
					for (const [id, prose] of Object.entries(byWord)) {
						out.push({ where: at(`${id}.${key}`), text: prose });
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
