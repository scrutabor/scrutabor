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
	hasParticipation,
	inMassForm,
	isDialogue,
	isSharedPrayer,
	marked,
	namesConditionalParticipation,
	namesSpeaker,
	namesVoice,
	saidByEveryone,
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
const participating = (speaker: string, forms: ('cantu' | 'lecta')[]): Segment =>
	({
		...verse(speaker),
		participation: Object.fromEntries(forms.map((form) => [form, { source: 'DMS' }]))
	}) as Segment;

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

describe('a prayer shared with the faithful', () => {
	it('recognises a whole Ordinary part in the applicable Mass form', () => {
		const credo = [
			participating('sacerdos', ['cantu', 'lecta']),
			participating('sacerdos', ['cantu', 'lecta'])
		];
		expect(isSharedPrayer(credo, 'cantu')).toBe(true);
		expect(isSharedPrayer(credo, 'lecta')).toBe(true);
	});

	it('recognises an alternating Ordinary when every line belongs to the faithful', () => {
		const kyrie = [participating('sacerdos', ['cantu']), participating('minister', ['cantu'])];
		expect(isSharedPrayer(kyrie, 'cantu')).toBe(true);
		expect(isSharedPrayer(kyrie, 'lecta')).toBe(false);
	});

	it('keeps a one-line fixed response distinct', () => {
		expect(isSharedPrayer([participating('minister', ['lecta'])], 'lecta')).toBe(false);
	});

	it('does not generalise from only part of a longer prayer', () => {
		const pater = [participating('sacerdos', ['lecta']), verse('sacerdos')];
		expect(isSharedPrayer(pater, 'lecta')).toBe(false);
	});

	it('does not turn a conditional faculty into a shared prayer', () => {
		const proper = [
			{
				...participating('sacerdos', ['cantu']),
				participation: { cantu: { source: 'DMS 25 c', conditional: true } }
			},
			{
				...participating('sacerdos', ['cantu']),
				participation: { cantu: { source: 'DMS 25 c', conditional: true } }
			}
		] as Segment[];
		expect(isSharedPrayer(proper, 'cantu')).toBe(false);
	});
});

describe('delivery in each form of Mass', () => {
	it('keeps the low-Mass base and applies the sung-Mass override', () => {
		const proper = {
			...verse('sacerdos', { voice: 'clara' }),
			delivery: { cantu: { speaker: 'schola', voice: 'cantus' } }
		} as Segment;
		expect(inMassForm(proper, 'lecta').speaker).toBe('sacerdos');
		expect(inMassForm(proper, 'lecta').voice).toBe('clara');
		expect(inMassForm(proper, 'cantu').speaker).toBe('schola');
		expect(inMassForm(proper, 'cantu').voice).toBe('cantus');
	});
});

describe('naming a conditional faculty', () => {
	const conditional = (): Segment =>
		({
			...verse('sacerdos'),
			participation: { lecta: { source: 'DMS 31 d', conditional: true } }
		}) as Segment;

	it('names only the start of an uninterrupted run', () => {
		const segs = [conditional(), conditional()];
		expect(namesConditionalParticipation(segs, 0, 'lecta')).toBe(true);
		expect(namesConditionalParticipation(segs, 1, 'lecta')).toBe(false);
	});

	it('names it again after a rubric', () => {
		const segs = [conditional(), rubric(), conditional()];
		expect(namesConditionalParticipation(segs, 2, 'lecta')).toBe(true);
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

	it('names a single fixed response when participation makes it the reader’s line', () => {
		const response = [
			{
				...verse('minister'),
				participation: { cantu: { gradus: 1, source: 'DMS 25 a' } }
			} as Segment
		];
		expect(hasAnswers(response)).toBe(false);
		expect(hasParticipation(response)).toBe(true);
		expect(namesSpeaker(response, 0)).toBe(true);
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

	// The Ave María: an unattributed first half, then "Sancta María" and the
	// rest said by everyone. The turn from nobody to omnes printed an O.
	// with no name beside it, over a line already the reader's.
	it('and nowhere in a prayer that is everyone’s throughout', () => {
		const ave = [verse(undefined), verse('omnes')];
		expect(saidByEveryone(ave)).toBe(true);
		expect(marked(ave, 1)).toBe(false);
	});

	it('but a prayer said throughout by the priest keeps its mark', () => {
		// Which is the point of the distinction: there the mark says
		// something the reader needs, that these words are not theirs.
		const canon = [verse('sacerdos'), verse('sacerdos')];
		expect(saidByEveryone(canon)).toBe(false);
		expect(marked(canon, 0)).toBe(true);
	});

	it('and a plain prayer that is a real dialogue keeps every one', () => {
		// The Angelus, which is next on the prayer shelf: everyone's answer
		// to the celebrant's versicle, and the books mark both.
		const angelus = [verse('sacerdos'), verse('omnes'), verse('sacerdos'), verse('omnes')];
		expect(saidByEveryone(angelus)).toBe(false);
		expect([0, 1, 2, 3].map((i) => marked(angelus, i))).toEqual([true, true, true, true]);
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

	it('keeps a short opening that is already the prayer', () => {
		const segs = [verse('omnes', { words: 2 }), verse('omnes', { words: 4 })];
		expect(firstVerseWithInitial(segs)).toBe(0);
	});

	it('and none at all in a dialogue, as the books give none', () => {
		expect(firstVerseWithInitial(DIALOGUE)).toBe(-1);
	});
});
