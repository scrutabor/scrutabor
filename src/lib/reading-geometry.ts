/**
 * How a raised initial is fitted, and how far the gloss row under it has to
 * move to let the letter through.
 *
 * This is arithmetic over measurements taken off the reading face itself,
 * and it lives apart from the component that renders with it for two
 * reasons. It is the part of the reading surface most expensive to get
 * right — every constant below was measured, and several were measured
 * twice after a wrong one shipped — and until now the only way to exercise
 * it was to open a browser and look at a word. It is pure: the same letter
 * gives the same numbers, so it can be tested directly.
 *
 * Everything is in em of the READING SIZE unless a name says otherwise, so
 * that one custom property (--reading, app.css) scales all of it.
 */

// Fitting a letter set larger than the letters beside it. Three
// measurements off the reading face itself (canvas actualBoundingBox
// against the advance), and everything else follows from them.
//
// SIDEBEARINGS, as fractions of the letter's own size. Ink that CROSSES
// the advance (Q's tail, A's diagonal) lands on the next glyph whatever
// the font intended at 1em, so all of it is cleared; ink that STOPS
// SHORT only leaves too big a gap, and only by what scaling added. No
// kerning term: a pair kerned for two letters of one size says nothing
// about a letter set nearly twice as large beside a small one, and
// importing it pulled T's arm onto the e of Te ígitur.
const SB: Record<string, [number, number]> = {
	P: [0.024, 0.025],
	S: [0.04, 0.043],
	C: [0.046, 0.055],
	A: [-0.002, -0.005],
	D: [0.029, 0.035],
	E: [0.037, 0.025],
	M: [0.019, 0.036],
	Q: [0.045, -0.116],
	I: [0.019, 0.018],
	G: [0.045, 0.036],
	H: [0.037, 0.04],
	L: [0.027, 0.009],
	O: [0.045, 0.045],
	B: [0.019, 0.04],
	N: [0.012, 0.01],
	V: [0.0, -0.006],
	T: [0.027, 0.002],
	U: [0.024, 0.01],
	// Measured 2026-08-20, same method (canvas actualBoundingBox against
	// the advance, EB Garamond Variable 400, validated by re-deriving P, E,
	// C, Q and T to the third decimal first). R and F had opened twelve
	// texts on the silent [0,0] fallback — two of them in production — and
	// the accented capitals carry the acute's own ink, which is why they
	// cannot borrow their base letter's row.
	R: [0.024, -0.005],
	F: [0.03, 0.027],
	Á: [-0.002, -0.005],
	É: [0.037, 0.025],
	Í: [0.019, 0.018],
	Ó: [0.045, 0.045],
	Ú: [0.024, 0.01]
};

// DESCENT below the baseline, in the letter's own em. Q reaches furthest
// below the line — at 1.75 its tail put 3.6px into the gloss underneath.
// (An earlier comment here called Q "the only capital that opens a prayer
// in this corpus and reaches below the line", which was stale in a
// load-bearing way: the set of opening capitals grows with every Sunday
// added, and the coverage test in reading-geometry.test.ts is what now
// holds the tables to the corpus, not a sentence.)
//
// Shrinking it was the wrong answer — the owner's, and he is right: a Q
// two-thirds the size of every other initial is a worse fault than the
// one it fixes, and the ink is not where a sideways nudge could help
// either (the tail falls straight over the START of the gloss word, so
// clearing it that way would drag the gloss 36px off its own word).
// The line gives way instead: the whole gloss row of that verse sinks
// by what the tail needs, so the glosses stay level with EACH OTHER,
// which is the alignment a reader can see, and only sit a hair lower
// than the row of some other verse, which nobody can.
// INK reach above and below the baseline, in the letter's own em. The
// highlight is drawn on the base box, and that box is sized for text at
// the reading size: an initial at 1.75 pokes out of the top of it, and
// Q's tail out of the bottom. Padding on an inline element grows the
// box it paints without touching the line, which is exactly what is
// wanted — the wash covers the whole letter and the gloss does not move.
const INK: Record<string, [number, number]> = {
	P: [0.658, 0.005],
	S: [0.664, 0.016],
	C: [0.663, 0.015],
	A: [0.686, 0.005],
	D: [0.659, 0.007],
	E: [0.653, 0.005],
	M: [0.656, 0.011],
	Q: [0.664, 0.248],
	I: [0.653, 0.005],
	G: [0.663, 0.014],
	H: [0.653, 0.005],
	L: [0.653, 0.005],
	O: [0.664, 0.014],
	B: [0.657, 0.005],
	N: [0.658, 0.017],
	V: [0.653, 0.012],
	T: [0.694, 0.005],
	U: [0.653, 0.014],
	// Measured with the SB additions above. The acute carries the accented
	// capitals' ink to 0.838em — a quarter above the plain cap height —
	// which is exactly the clearance the fallback was silently not giving
	// Éxcita.
	R: [0.657, 0.021],
	F: [0.66, 0.005],
	Á: [0.838, 0.005],
	É: [0.838, 0.005],
	Í: [0.838, 0.005],
	Ó: [0.838, 0.014],
	Ú: [0.838, 0.014]
};
// how far the base's own box reaches, measured, less the padding it
// already carries
const BOX_ASC = 1.073 - 0.06;
const BOX_DESC = 0.362 - 0.06;
const PAD = 0.06;
// The box measurement is of one rendering of one font, and the next
// environment measures its own: 0.04em was enough for this machine's
// build and left L 0.06px proud of its highlight on CI's. The margin
// is 0.1em — about two pixels, which no one can see on a wash and no
// rounding is going to cross.
const COVER = 0.1;

const DESCENT: Record<string, number> = { Q: 0.248 };
// The gloss row sits GLOSS_GAP lower than ruby puts it, so a descender
// has that much more room before it: measured 0.272em from the baseline
// to the ink of the gloss, plus the gap.
//
// It used to be 0.32rem, chosen so that even the raised initial's tail
// cleared the gloss without the line giving way — and that pushed the
// gloss AWAY from the Latin it belongs to and towards the Latin below,
// which on a verse that wraps left the two indistinguishable: measured
// 1.3px to its own line against 2.0px to the next. A reader had no cue
// which line a gloss went with, and the whole column read as evenly
// spaced rather than as pairs. So it comes back to what an ordinary
// descender actually needs (0.341em of room against a p or q's 0.24em),
// and the raised initial does what it was always meant to do when its
// tail is too long: sink that one verse's gloss row (see `sink`).
// A FRACTION OF THE READING SIZE, not a length: mirrors --gloss-gap in
// app.css, which is what actually positions the row. This copy exists
// because the sink decision below has to be made in numbers, and the
// test 'the reading size is the only knob' holds the two together by
// rendering at two sizes and checking the geometry still lands.
export const GLOSS_GAP = 0.152;
const ROOM_BELOW = 0.272 + GLOSS_GAP;
const RAISED = 1.75;
// A large letter wants more room around it than its metrics ask for:
// the one judgement in all of this, and what stops A reading as touching
// the word before it while measuring as neutral on both sides.
const AIR = 0.03;

/** How far this verse's gloss row has to sink for the initial's tail,
 * in the reading size's em — nothing unless the letter reaches below
 * the line. */
export function sinkFor(letter: string, glossed: boolean): number {
	const descent = DESCENT[letter] ?? 0;
	if (!glossed || descent === 0) return 0;
	const over = descent * RAISED - ROOM_BELOW; // in the reading size's em
	return over <= 0 ? 0 : over + 0.014;
}

/** [font-size, margin-start, margin-end, gloss lift] for an initial, all
 * in the initial's own em except the lift and the sink, which are in the
 * reading size's em. */
/** Whether a letter has measured metrics in BOTH tables. The renderer
 * degrades softly on an unmeasured letter (a reader must never crash over
 * a margin), so this is how the build stays loud about it instead: the
 * coverage test walks every initial the corpus actually opens with. */
export function measuredInitial(letter: string): boolean {
	return letter in SB && letter in INK;
}

export function initialFit(letter: string, glossed: boolean) {
	const scale = RAISED;
	const [sbStart, sbEnd] = SB[letter] ?? [0, 0];
	const air = AIR / scale;
	const side = (sb: number) => (sb < 0 ? -sb + air : (-(scale - 1) / scale) * sb + air);
	return {
		scale,
		start: side(sbStart),
		end: side(sbEnd),
		// a taller glyph raises the ruby base box and the annotation rides
		// down with it: 4px measured at scale 1.75 against a 1.45rem
		// reading size, and it scales with the extra size — so 0.23 of
		// the reading size for every 1 of that extra
		lift: (scale - 1) * 0.23,
		sink: sinkFor(letter, glossed),
		// the wash has to cover the whole letter, top and tail
		padTop: Math.max(PAD, (INK[letter]?.[0] ?? 0) * scale - BOX_ASC + COVER),
		padBottom: Math.max(PAD, (INK[letter]?.[1] ?? 0) * scale - BOX_DESC + COVER)
	};
}
