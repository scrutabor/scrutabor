// The house rules for the words the app itself says.
//
// These are the app's OWN strings — the interface, the movement notes, the
// grammar explanations. The corpus's prose (glosses, word notes, the about
// sheets) is content and answers to the corpus's own checks; this file makes
// no claim on it.
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
		const offenders = prose()
			.filter(({ text }) => text.includes(';'))
			.map(({ where, text }) => `${where}: ${text.slice(0, 60)}`);
		expect(offenders, `use a full stop or an "and":\n  ${offenders.join('\n  ')}`).toEqual([]);
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
