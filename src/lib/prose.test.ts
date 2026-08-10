// The house rules for the words this edition says, wherever they come from.
//
// Two bodies of prose reach the reader. The app's own strings — the
// interface, the movement notes, the grammar concepts — and the corpus's,
// which is the larger half: about sheets, rubric narratives, and the word
// notes that carry most of the edition's writing. Both are swept here,
// because the reader cannot tell which is which and the rule is about what
// they see.
//
// The verse TRANSLATIONS are exempt, and that is not an oversight: their
// punctuation belongs to the text being translated, not to this edition's
// voice, and the received wording the corpus aligned to is not ours to
// repunctuate.
import { readFileSync, readdirSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { CONCEPTS } from './grammar';
import { M } from './i18n';
import { ORDO } from './ordo';

/** Every string the app can put in front of a reader, with where it lives. */
function prose(): { where: string; text: string }[] {
	const out: { where: string; text: string }[] = [];
	const walk = (node: unknown, where: string) => {
		if (typeof node === 'string') out.push({ where, text: node });
		else if (Array.isArray(node)) node.forEach((v, i) => walk(v, `${where}[${i}]`));
		else if (node && typeof node === 'object')
			for (const [k, v] of Object.entries(node)) walk(v, `${where}.${k}`);
	};
	walk(M, 'i18n');
	walk(ORDO, 'ordo');
	walk(CONCEPTS, 'grammar');
	return out;
}

/** Every prose string the corpus puts on a page, except verse translations. */
function corpusProse(): { where: string; text: string }[] {
	const dir = 'src/lib/data';
	const out: { where: string; text: string }[] = [];
	for (const file of readdirSync(dir)) {
		if (!file.endsWith('.json')) continue;
		const doc = JSON.parse(readFileSync(`${dir}/${file}`, 'utf8'));
		if (!doc.lang) continue; // the Latin source carries no prose of ours
		const at = (k: string) => `${file}:${k}`;
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

/** One rule, asked of both bodies of prose. */
function noSemicolons(all: { where: string; text: string }[]) {
	const offenders = all
		.filter(({ text }) => text.includes(';'))
		.map(({ where, text }) => `${where}: ${text.slice(0, 60)}`);
	expect(offenders, `use a full stop or an "and":\n  ${offenders.join('\n  ')}`).toEqual([]);
}

describe('the words the app says', () => {
	it('sweeps the whole of what the app says', () => {
		// A sweep that finds nothing proves nothing. These are the three
		// tables the reader's words come from, and if the walk stopped
		// descending into them the rules below would pass on an empty list.
		const all = prose();
		expect(all.length, 'the walk reaches the strings').toBeGreaterThan(400);
		for (const table of ['i18n', 'ordo', 'grammar'])
			expect(
				all.some(({ where }) => where.startsWith(table)),
				`${table} was not reached`
			).toBe(true);
		// and it reaches the deep ones, not just the top level
		expect(all.some(({ text }) => text.includes('Ministrant dzwoni przy każdym geście'))).toBe(
			true
		);
	});

	it('never reaches for a semicolon', () => {
		// The owner's rule (2026-08-10): a semicolon in a six-word label is
		// punctuation the surface cannot carry, and in a note it is usually
		// a full stop that lost its nerve. 51 of them lived in the movement
		// notes alone. Two sentences, or an "and" — not this.
		noSemicolons(prose());
	});

	it('and neither does the corpus, outside the text it is translating', () => {
		// 589 of these were rewritten on 2026-08-10 — the larger half of the
		// sweep, and the half a reader meets most, since the word notes are
		// where this edition does its explaining.
		const all = corpusProse();
		expect(all.length, 'the vendored prose is reachable').toBeGreaterThan(2000);
		noSemicolons(all);
	});

	it('does not hedge where the rite is definite', () => {
		// "as the custom is", "depending on usage" — a reader who came to
		// find out what to do is told the book does not know either (owner,
		// 2026-08-10). Where the sources genuinely differ, name them and
		// say which; where they do not, say the thing.
		const hedges = /\b(zależnie od zwyczaju|jak wypada|as the custom is|depending on usage)\b/i;
		const offenders = prose()
			.filter(({ text }) => hedges.test(text))
			.map(({ where, text }) => `${where}: ${text.slice(0, 60)}`);
		expect(offenders, `say what the rite says:\n  ${offenders.join('\n  ')}`).toEqual([]);
	});
});
