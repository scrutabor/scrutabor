// The arithmetic behind a raised initial.
//
// Every one of these numbers was measured off the reading face, several of
// them twice because a wrong one shipped and had to be found by eye in a
// browser. That is the reason for this file: the rules they encode are
// stated here in a form that fails in a second, so the next wrong constant
// is caught before anyone has to notice a letter touching its neighbour.
import { describe, expect, it } from 'vitest';
import { initialFit, measuredInitial } from './reading-geometry';
import { loadAllCoreTexts } from './corpus';
import { firstVerseWithInitial } from './speaker-marks';

const TEXTS = await loadAllCoreTexts();

describe('fitting the initial', () => {
	it('sets it at the raised size, not a dropped one', () => {
		// raised, because a dropped initial floats and a float cuts through
		// the gloss line under the first words
		expect(initialFit('P', true).scale).toBeGreaterThan(1);
		expect(initialFit('P', true).scale).toBeLessThan(2);
	});

	it('clears ink that crosses the advance, on the side it crosses', () => {
		// Q's tail runs out to the RIGHT of its advance (a negative
		// sidebearing), so the space after it has to be opened
		const q = initialFit('Q', true);
		expect(q.end).toBeGreaterThan(0.05);
	});

	it('and only gives back what scaling added where ink stops short', () => {
		// C's ink stops well inside its advance; at 1.75em the gap that
		// leaves would read as a word break if it were not pulled in
		const c = initialFit('C', true);
		expect(c.start).toBeLessThan(0);
	});

	it('gives every letter a little air, even one measured flush', () => {
		// A's diagonal reaches its advance on both sides, and measured
		// neutral it still read as touching the word before it
		const a = initialFit('A', true);
		expect(a.start).toBeGreaterThan(0);
		expect(a.end).toBeGreaterThan(0);
	});

	it('covers the whole letter, top and tail, with the wash', () => {
		// the padding is what the highlight paints over: an initial at 1.75
		// pokes out of a box sized for text at the reading size
		const l = initialFit('L', true); // reaches up
		const q = initialFit('Q', true); // and down
		expect(l.padTop).toBeGreaterThan(0);
		expect(q.padBottom).toBeGreaterThan(l.padBottom);
	});

	it('never gives a letter less padding than the floor', () => {
		// a letter shorter than the box still needs the wash to have edges
		for (const letter of 'PSCADEMIGHLONBQTV') {
			const fit = initialFit(letter, true);
			expect(fit.padTop, `${letter} padTop`).toBeGreaterThanOrEqual(0.06);
			expect(fit.padBottom, `${letter} padBottom`).toBeGreaterThanOrEqual(0.06);
		}
	});

	it('is defined for a letter it has never seen', () => {
		// a new text may open with any capital; an unmeasured one must fall
		// back to neutral rather than produce NaN and break the line
		const fit = initialFit('Z', true);
		for (const [name, value] of Object.entries(fit)) {
			expect(Number.isFinite(value), `${name} is ${value}`).toBe(true);
		}
	});

	it('and for the empty string, which a text with no words would give it', () => {
		const fit = initialFit('', true);
		for (const [name, value] of Object.entries(fit)) {
			expect(Number.isFinite(value), `${name} is ${value}`).toBe(true);
		}
	});
});

describe('the tables against the corpus', () => {
	it('hold a measured row for every initial the book actually raises', () => {
		// The soft fallback in initialFit is for the READER — a crash over a
		// margin would be absurd — and this is where it stops being silent:
		// twelve texts (Réquiem, Regína, four Advent epistles' Fratres, the
		// Éxcita collects) had already shipped or vendored on the [0,0] row,
		// each initial under-cleared and poking out of its own wash. The set
		// of opening capitals grows with every Sunday; this walks them all.
		const unmeasured: string[] = [];
		for (const [key, entry] of Object.entries(TEXTS)) {
			const at = firstVerseWithInitial(entry.segments);
			if (at === -1) continue;
			const letter = entry.segments[at].words?.[0]?.form.slice(0, 1) ?? '';
			if (letter && !measuredInitial(letter)) unmeasured.push(`${key}: ${letter}`);
		}
		expect(unmeasured).toEqual([]);
	});
});
