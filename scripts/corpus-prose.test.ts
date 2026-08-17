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
	for (const file of readdirSync(dir)) {
		if (!file.endsWith('.json')) continue;
		const doc = JSON.parse(readFileSync(`${dir}/${file}`, 'utf8'));
		if (!doc.lang) continue; // the Latin source carries no prose of ours
		const at = (k: string) => `${file}:${k}`;
		// The LEXICON keeps its prose at entries[lemma].note, not words[id].note,
		// so this walk stepped past all 329 of them until 2026-08-16 — and the
		// lexicon is vendored and rendered, so every one reached a lemma page.
		for (const [lemma, entry] of Object.entries(doc.entries ?? {}) as [
			string,
			Record<string, string>
		][])
			if (entry.note) out.push({ where: at(`${lemma}.note`), text: entry.note });
		if (doc.about) out.push({ where: at('about'), text: doc.about });
		for (const [sid, seg] of Object.entries(doc.segments ?? {}) as [
			string,
			Record<string, string>
		][])
			if (seg.narrative) out.push({ where: at(`${sid}.narrative`), text: seg.narrative });
		for (const [wid, w] of Object.entries(doc.words ?? {}) as [string, Record<string, string>][])
			for (const k of ['note', 'function'])
				if (w[k]) out.push({ where: at(`${wid}.${k}`), text: w[k] });
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
