import { expect, it } from 'vitest';
import { validateLocalizedBody } from './localized-body';
import { properData, canonData, dismissalData } from './loaders';
import { PROPER_DAYS } from './proprium';
import { interlinearRuns } from './interlinear';

it.each(['pl', 'en'] as const)(
	'accepts every actual %s formulary body and both variant resources',
	async (lang) => {
		expect(PROPER_DAYS).toHaveLength(113);
		let bodies = 0;
		let grouped = 0;
		for (const day of PROPER_DAYS) {
			const body = await properData(day.id, lang);
			expect(body).not.toBeNull();
			for (const part of body!.parts) {
				expect(() => validateLocalizedBody(part, lang, body!.lex), part.key).not.toThrow();
				bodies++;
				for (const segment of part.doc.segments.filter((s) => s.type === 'verse')) {
					const localized = part.gloss.segments[segment.id];
					grouped += localized.alignments?.length ?? 0;
					expect(interlinearRuns(segment.words!, localized).flatMap((run) => run.words)).toEqual(
						segment.words
					);
				}
			}
		}
		expect(bodies).toBe(1267);
		expect(grouped).toBeGreaterThan(0);
		for (const pack of [await canonData(lang), await dismissalData(lang)]) {
			for (const part of pack.parts)
				expect(() => validateLocalizedBody(part, lang, pack.lex)).not.toThrow();
		}
	}
);

it.each(['pl', 'en'] as const)(
	'does not confuse repeated %s Mass occurrences with duplicate per-text IDs',
	async (lang) => {
		const body = (await properData('dominica-i-in-quadragesima', lang))!;
		const repeated = body.parts.filter(
			(p) => p.key === 'proprium/dominica-i-in-quadragesima-offertorium'
		);
		expect(repeated).toHaveLength(2);
		expect(repeated.map((p) => p.part)).toEqual(['offertorium', 'communio']);
		for (const part of repeated)
			expect(() => validateLocalizedBody(part, lang, body.lex)).not.toThrow();
	}
);

it('accepts direct, shared and zero realizations and rejects a direct gloss beside a declared group', async () => {
	const pack = await dismissalData('en');
	const part = pack.parts[0];
	const zero = { words: ['w007'], forms: ['Ite'], reason: 'inflection' as const };
	part.gloss.segments.s05.alignments = [zero];
	part.gloss.words.w007 = { alignment: zero };
	expect(() => validateLocalizedBody(part, 'en', pack.lex)).not.toThrow();
	part.gloss.words.w007.gloss = 'go';
	expect(() => validateLocalizedBody(part, 'en', pack.lex)).toThrow();
});
