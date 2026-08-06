// The arithmetic behind a raised initial.
//
// Every one of these numbers was measured off the reading face, several of
// them twice because a wrong one shipped and had to be found by eye in a
// browser. That is the reason for this file: the rules they encode are
// stated here in a form that fails in a second, so the next wrong constant
// is caught before anyone has to notice a letter touching its neighbour.
import { describe, expect, it } from 'vitest';
import { GLOSS_GAP, initialFit, sinkFor } from './reading-geometry';

// Q is the only letter in the corpus whose tail reaches below the line;
// L and A are the two whose ink crosses their advance sideways.
const TAILED = 'Q';

describe('the gloss gap', () => {
	it('leaves an ordinary descender more room than it needs', () => {
		// 0.272em from the baseline to the ink of the gloss, plus the gap,
		// against a p or q's 0.24em. The margin is small on purpose: the gap
		// was 0.32 once and pushed the gloss away from the word it belongs to.
		const roomBelowTheBaseline = 0.272 + GLOSS_GAP;
		expect(roomBelowTheBaseline).toBeGreaterThan(0.24);
		expect(roomBelowTheBaseline).toBeLessThan(0.5);
	});
});

describe('sinking the gloss row for a tail', () => {
	it('does not move it for a letter that stays above the line', () => {
		for (const letter of 'PSCADEMIGHLONBTV') {
			expect(sinkFor(letter, true), `${letter} should need no sink`).toBe(0);
		}
	});

	it('moves it for the one letter whose tail reaches through', () => {
		expect(sinkFor(TAILED, true)).toBeGreaterThan(0);
	});

	it('and moves it no further than the tail actually goes', () => {
		// the sink exists to clear 0.248em scaled by 1.75; anything much
		// larger is a gap the reader sees and the letter did not ask for
		expect(sinkFor(TAILED, true)).toBeLessThan(0.05);
	});

	it('does nothing at all when no gloss is showing', () => {
		// nothing to clear: the slider is at bare Latin
		expect(sinkFor(TAILED, false)).toBe(0);
	});
});

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

	it('lifts the gloss by what the taller letter raised the base box', () => {
		// a taller glyph raises the ruby base and the annotation rides down
		// with it; the lift takes that back
		expect(initialFit('P', true).lift).toBeGreaterThan(0);
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
