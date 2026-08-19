// The prose the ROUTES write into their own templates.
//
// src/lib/prose.test.ts walks three tables — the interface strings, the
// movement notes, the grammar concepts — and every sentence written straight
// into a page stood outside it: the edition page, the pronunciation page, the
// privacy and support pages, the landing, the bibliography. That is where all
// ten of the semicolons found on 2026-08-19 were living, in prose the house
// rule had never been asked about because no test could see it.
//
// It lives here rather than under src/ for the reason corpus-prose.test.ts
// does: it reads files, and node's types are not in the app's tsconfig.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = 'src/routes';

/** Blocks whose contents are code, not prose. */
const SKIPPED = ['script', 'style'];

/** The entities the pages actually write. An unknown one becomes a space
 * rather than surviving as `&name;`, whose trailing character would read as a
 * semicolon the author never typed. `nbsp` becomes an ORDINARY space on
 * purpose: the Polish binding writes it between a one-letter word and what
 * follows, and a hedge spelled across one must still match as two words. */
const ENTITIES: Record<string, string> = {
	nbsp: ' ',
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	hellip: '…',
	mdash: '—',
	ndash: '–',
	times: '×',
	laquo: '«',
	raquo: '»',
	rsquo: '’',
	lsquo: '‘',
	ldquo: '“',
	rdquo: '”',
	bdquo: '„'
};

function svelteFiles(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) out.push(...svelteFiles(path));
		else if (entry.name.endsWith('.svelte')) out.push(path);
	}
	return out.sort();
}

/** The index just past the tag opening at `from`.
 *
 * Not `indexOf('>')`: a Svelte attribute holds a whole expression, and
 * `onclick={() => (open = !open)}` closes a naive scan in the middle of an
 * arrow function — spilling JavaScript into what this file then judges as the
 * reader's prose. Braces and quotes are tracked so the tag ends where it
 * really ends. */
function endOfTag(source: string, from: number): number {
	let depth = 0;
	let quote = '';
	for (let i = from + 1; i < source.length; i++) {
		const ch = source[i];
		if (quote) {
			if (ch === quote) quote = '';
		} else if (ch === '"' || ch === "'" || ch === '`') quote = ch;
		else if (ch === '{') depth++;
		else if (ch === '}') depth--;
		else if (ch === '>' && depth === 0) return i + 1;
	}
	return source.length;
}

function decode(text: string): string {
	return text
		.replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (_, name: string) => ENTITIES[name] ?? ' ')
		.replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
		.replace(/&#x([0-9a-fA-F]+);/g, (_, code: string) => String.fromCodePoint(parseInt(code, 16)));
}

/** What is left of a component once the code is taken out of it: the words
 * between the tags, with the entities resolved to the characters they stand
 * for. Svelte's own `{…}` blocks stay, because a ternary between two tags is
 * as much reader-facing prose as the text beside it. */
export function templateText(source: string): string {
	const lower = source.toLowerCase();
	let out = '';
	let i = 0;
	while (i < source.length) {
		if (source[i] !== '<') {
			out += source[i++];
			continue;
		}
		if (lower.startsWith('<!--', i)) {
			const end = source.indexOf('-->', i);
			i = end === -1 ? source.length : end + 3;
			out += ' ';
			continue;
		}
		const block = SKIPPED.find((name) => lower.startsWith(`<${name}`, i));
		if (block) {
			const close = lower.indexOf(`</${block}>`, i);
			i = close === -1 ? source.length : close + block.length + 3;
			out += ' ';
			continue;
		}
		i = endOfTag(source, i);
		out += ' ';
	}
	return decode(out);
}

function routeProse(): { where: string; text: string }[] {
	return svelteFiles(ROOT).map((path) => ({
		where: path,
		text: templateText(readFileSync(path, 'utf8'))
	}));
}

/** The offending line, not the whole page: a route template is long, and a
 * page named without its sentence tells nobody what to fix. */
function lines(text: string, has: (line: string) => boolean): string[] {
	return text
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line && has(line));
}

describe('the words the routes say', () => {
	it('reaches the prose and leaves the code behind', () => {
		// A sweep that finds nothing proves nothing. This is the positive
		// control: the edition page's own sentences survive the strip, its
		// markup does not, and `&nbsp;` arrives as the space it stands for.
		const all = routeProse();
		expect(all.length, 'the walk reaches the route components').toBeGreaterThan(10);
		const editio = all.find(({ where }) => where.includes('editio'));
		expect(editio, 'the edition page is among them').toBeDefined();
		expect(editio!.text).toContain('The analyzers read the');
		expect(editio!.text).toContain('Analizatory rozpoznają');
		expect(editio!.text, 'the markup is gone').not.toContain('class="what"');
		expect(editio!.text, 'entities are resolved').not.toContain('&nbsp;');
		expect(editio!.text, 'and resolved to the character they stand for').toContain(
			'i wydań liturgii'
		);
	});

	it('never reaches for a semicolon', () => {
		// The same rule the interface strings answer to (src/lib/prose.test.ts),
		// asked of the sentences written straight into a page.
		const offenders = routeProse().flatMap(({ where, text }) =>
			lines(text, (line) => line.includes(';')).map((line) => `${where}: ${line.slice(0, 80)}`)
		);
		expect(offenders, `use a full stop or an "and":\n  ${offenders.join('\n  ')}`).toEqual([]);
	});

	it('does not hedge where the rite is definite', () => {
		const hedges = /\b(zależnie od zwyczaju|jak wypada|as the custom is|depending on usage)\b/i;
		const offenders = routeProse().flatMap(({ where, text }) =>
			lines(text, (line) => hedges.test(line)).map((line) => `${where}: ${line.slice(0, 80)}`)
		);
		expect(offenders, `say what the rite says:\n  ${offenders.join('\n  ')}`).toEqual([]);
	});
});
