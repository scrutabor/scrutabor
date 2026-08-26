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
