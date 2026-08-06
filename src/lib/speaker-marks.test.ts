// The rules that decide what a reader is told about who is speaking.
//
// Each of these is an editorial decision with a reason, and the reasons are
// the point: they were settled against what the books print and against the
// owner's own experience of losing the thread in a printed missal. Before
// this file the only way to check one was to open a page and count the
// marks on it.
import { describe, expect, it } from 'vitest';
import type { Segment } from './corpus';
import {
	afterRubric,
	firstVerseWithInitial,
	hasAnswers,
	isDialogue,
	marked,
	namesSpeaker,
	namesVoice,
	turns
} from './speaker-marks';

let n = 0;
const verse = (speaker?: string, opts: { voice?: string; words?: number } = {}): Segment =>
	({
		id: `s${++n}`,
		type: 'verse',
		speaker,
		voice: opts.voice,
		words: Array.from({ length: opts.words ?? 5 }, (_, i) => ({ id: `w${i}` }))
	}) as unknown as Segment;
const rubric = (): Segment => ({ id: `r${++n}`, type: 'rubric', text: '…' }) as unknown as Segment;

// A prayer: one voice throughout, and the answer at the end.
const PRAYER = [verse('sacerdos'), verse('sacerdos'), verse('sacerdos'), verse('minister')];
// A dialogue: the voice keeps changing hands.
const DIALOGUE = [verse('sacerdos'), verse('minister'), verse('sacerdos'), verse('minister')];

describe('telling a prayer from a dialogue', () => {
	it('counts a prayer as turning over once, at the answer', () => {
		expect(turns(PRAYER)).toBe(1);
		expect(isDialogue(PRAYER)).toBe(false);
	});

	it('and a dialogue as turning over and over', () => {
		expect(turns(DIALOGUE)).toBe(3);
		expect(isDialogue(DIALOGUE)).toBe(true);
	});

	it('a text said throughout by one voice is neither', () => {
		const alone = [verse('sacerdos'), verse('sacerdos')];
		expect(turns(alone)).toBe(0);
		expect(hasAnswers(alone)).toBe(false);
	});
});

describe('naming a speaker', () => {
	it('names each voice the first time it appears, and not after', () => {
		expect(namesSpeaker(DIALOGUE, 0)).toBe(true); // sacerdos, first
		expect(namesSpeaker(DIALOGUE, 1)).toBe(true); // minister, first
		expect(namesSpeaker(DIALOGUE, 2)).toBe(false); // sacerdos again
		expect(namesSpeaker(DIALOGUE, 3)).toBe(false);
	});

	it('names nobody where there is only one voice to name', () => {
		const alone = [verse('sacerdos'), verse('sacerdos')];
		expect(namesSpeaker(alone, 0)).toBe(false);
	});

	it('and says nothing about a verse with no speaker at all', () => {
		expect(namesSpeaker([verse(undefined)], 0)).toBe(false);
	});
});

describe('a rubric between two verses', () => {
	it('is seen by the verse that follows it', () => {
		const segs = [verse('sacerdos'), rubric(), verse('sacerdos')];
		expect(afterRubric(segs, 2)).toBe(true);
	});

	it('is not seen by a verse that follows another verse', () => {
		expect(afterRubric(PRAYER, 1)).toBe(false);
	});

	it('and the first verse of a text has nothing before it', () => {
		expect(afterRubric(PRAYER, 0)).toBe(false);
	});
});

describe('where the mark prints', () => {
	it('on the first line, which has no voice before it', () => {
		expect(marked(PRAYER, 0)).toBe(true);
	});

	it('not on every line of one voice — four V.s say the same thing four times', () => {
		expect(marked(PRAYER, 1)).toBe(false);
		expect(marked(PRAYER, 2)).toBe(false);
	});

	it('but yes where the voice turns', () => {
		expect(marked(PRAYER, 3)).toBe(true); // the answer
	});

	it('and yes after a rubric, even for the same voice', () => {
		// Per ipsum has a direction between every phrase, and the reader is
		// coming back to the text each time
		const segs = [verse('sacerdos'), rubric(), verse('sacerdos')];
		expect(marked(segs, 2)).toBe(true);
	});

	it('never on a verse with no speaker', () => {
		expect(marked([verse(undefined)], 0)).toBe(false);
	});
});

describe('where the voice is named', () => {
	it('never for the ordinary speaking voice', () => {
		const segs = [verse('sacerdos', { voice: 'clara' })];
		expect(namesVoice(segs, 0)).toBe(false);
	});

	it('once where a quiet voice begins', () => {
		const segs = [verse('sacerdos', { voice: 'clara' }), verse('sacerdos', { voice: 'secreto' })];
		expect(namesVoice(segs, 1)).toBe(true);
	});

	it('and not again over every line of a prayer said quietly throughout', () => {
		const segs = [verse('sacerdos', { voice: 'secreto' }), verse('sacerdos', { voice: 'secreto' })];
		expect(namesVoice(segs, 1)).toBe(false);
	});

	it('but again after a rubric, which is worth saying twice', () => {
		const segs = [
			verse('sacerdos', { voice: 'secreto' }),
			rubric(),
			verse('sacerdos', { voice: 'secreto' })
		];
		expect(namesVoice(segs, 2)).toBe(true);
	});

	it('and says nothing about a verse whose voice was never recorded', () => {
		// the Canon's silence is not in any rubric this corpus transcribes
		expect(namesVoice([verse('sacerdos')], 0)).toBe(false);
	});
});

describe('which verse opens with the initial', () => {
	it('the first one with something to say', () => {
		expect(firstVerseWithInitial(PRAYER)).toBe(0);
	});

	it('not a call to pray standing on its own', () => {
		// "Orémus." is one word; the book gives the initial to the prayer
		// that follows it, not to it
		const segs = [verse('sacerdos', { words: 1 }), verse('sacerdos', { words: 8 })];
		expect(firstVerseWithInitial(segs)).toBe(1);
	});

	it('and none at all in a dialogue, as the books give none', () => {
		expect(firstVerseWithInitial(DIALOGUE)).toBe(-1);
	});
});
