import { describe, expect, it } from 'vitest';
import { loadAllCoreTexts } from './corpus';
import { ORDO, partVoice } from './ordo';

const TEXTS = await loadAllCoreTexts();

// The spine states how loudly each part is said, and so does the corpus, one
// segment at a time. Two layers holding the same fact drift apart unless
// something compares them, and this is the fact the role filter acts on: a
// reader in the pew is shown a folded line wherever the spine says quiet.
//
// The spine is coarser ON PURPOSE — a part with one silent Amen inside it is
// still said aloud — so the comparison asks for agreement in direction, not
// segment by segment.
// Rubricae generales 424 (MR 1962 p. xxix): after the blessing and procession of
// candles or palms, the blessing of ashes or a Rogation procession, and at the
// Easter Vigil, the Mass begins without the prayers at the foot of the altar.
// The Purification Missal repeats it on its own page (p. 466).
describe('the prayers at the foot say when they are omitted', () => {
	it('names the candle, palm, ash and Rogation rites and the Easter Vigil', () => {
		const first = ORDO.find((m) => m.id === 'praeparatio')!.entries[0];
		expect(first.id).toBe('introibo');
		expect(first.when?.en).toMatch(/candles/);
		expect(first.when?.en).toMatch(/palms/);
		expect(first.when?.en).toMatch(/ashes/);
		expect(first.when?.en).toMatch(/Rogation/);
		expect(first.when?.en).toMatch(/Easter Vigil/);
		expect(first.when?.pl).toMatch(/świec/);
		expect(first.when?.pl).toMatch(/palm/);
		expect(first.when?.pl).toMatch(/popiołu/);
		expect(first.when?.pl).toMatch(/błagalna/);
		expect(first.when?.pl).toMatch(/Wigilię Paschalną/);
	});
});

describe('the spine and the corpus agree about the quiet', () => {
	const entries = ORDO.flatMap((m) => m.entries).filter((e) => e.text);

	function voices(textKey: string): string[] {
		const entry = TEXTS[textKey];
		if (!entry) return [];
		return entry.segments.filter((s) => s.words?.length).map((s) => s.voice ?? '');
	}

	it('covers every part the spine names', () => {
		expect(entries.length).toBeGreaterThan(30);
		for (const e of entries) expect(TEXTS[e.text!], e.text).toBeDefined();
	});

	it('never calls a part quiet that the corpus says is said aloud', () => {
		for (const e of entries) {
			const id = e.text!.split('/')[1];
			if (partVoice(id) !== 'secreto') continue;
			const v = voices(e.text!);
			expect(v, `${id}: the spine says secreto`).toContain('secreto');
			expect(
				v.filter((x) => x === 'secreto').length,
				`${id}: the spine says secreto, the corpus reads it mostly aloud`
			).toBeGreaterThanOrEqual(v.filter((x) => x === 'clara').length);
		}
	});

	it('never calls a part raised that the corpus reads wholly aloud', () => {
		for (const e of entries) {
			const id = e.text!.split('/')[1];
			if (partVoice(id) !== 'submissa') continue;
			const v = voices(e.text!);
			expect(
				v.some((x) => x === 'secreto' || x === 'submissa'),
				`${id}: the spine says submissa, the corpus marks nothing quieter than clara`
			).toBe(true);
		}
	});

	it('never leaves a wholly silent part off the quiet map', () => {
		for (const e of entries) {
			const id = e.text!.split('/')[1];
			if (partVoice(id)) continue;
			const v = voices(e.text!);
			if (!v.includes('secreto')) continue;
			expect(v, `${id}: every segment is secreto and the spine says aloud`).toContain('clara');
		}
	});
});
