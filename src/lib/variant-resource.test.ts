import { expect, it } from 'vitest';
import { dismissalData, canonData } from './loaders';
import { validateDismissalPack } from './dismissal';
import { validateCanonPack } from './canon';
import type { DismissalPack } from './dismissal';
import { interlinearRuns } from './interlinear';

it.each(['pl', 'en'] as const)(
	'preserves every %s Canon and dismissal realization',
	async (lang) => {
		const canon = await canonData(lang);
		expect(validateCanonPack(canon, lang).parts).toHaveLength(11);
		const dismissal = await dismissalData(lang);
		expect(validateDismissalPack(dismissal, lang).parts).toHaveLength(1);
		for (const pack of [canon, dismissal]) {
			for (const part of pack.parts) {
				for (const segment of part.doc.segments.filter((s) => s.type === 'verse')) {
					const runs = interlinearRuns(segment.words!, part.gloss.segments[segment.id]);
					expect(runs.flatMap((run) => run.words)).toEqual(segment.words);
				}
			}
		}
	}
);

const mutations: [string, (pack: DismissalPack) => void][] = [
	[
		'empty translation',
		(p) => {
			p.parts[0].gloss.segments.s05 = {};
		}
	],
	[
		'empty gloss',
		(p) => {
			p.parts[0].gloss.words.w007 = {};
		}
	],
	[
		'empty lemma',
		(p) => {
			p.lex.lemmata.eo.head = '';
		}
	],
	[
		'empty sense list',
		(p) => {
			p.lex.senses.eo.senses = [];
		}
	],
	[
		'duplicate word',
		(p) => {
			p.parts[0].doc.segments[4].words![1].id = 'w007';
		}
	],
	[
		'duplicate segment',
		(p) => {
			p.parts[0].doc.segments[4].id = 's02';
		}
	],
	[
		'unknown segment',
		(p) => {
			p.parts[0].doc.segments[4].type = 'unknown' as 'verse';
		}
	],
	[
		'missing morphology',
		(p) => {
			p.parts[0].doc.segments[4].words![0].morph.pos = '';
		}
	],
	[
		'missing rubric narrative',
		(p) => {
			p.parts[0].gloss.segments.s04 = {};
		}
	],
	[
		'bad shared membership',
		(p) => {
			p.parts[0].gloss.segments.s03.alignments![0].words = ['w006', 'w005'];
		}
	],
	[
		'bad shared form',
		(p) => {
			p.parts[0].gloss.segments.s03.alignments![0].forms[0] = 'wrong';
		}
	],
	[
		'missing shared gloss',
		(p) => {
			delete p.parts[0].gloss.segments.s03.alignments![0].gloss;
		}
	],
	[
		'duplicate shared group',
		(p) => {
			p.parts[0].gloss.segments.s03.alignments!.push(p.parts[0].gloss.segments.s03.alignments![0]);
		}
	],
	[
		'word-group mismatch',
		(p) => {
			p.parts[0].gloss.words.w006.alignment = undefined;
		}
	]
];
for (const lang of ['pl', 'en'] as const) {
	it.each(mutations)('rejects malformed localized ' + lang + ' body: %s', async (_, mutate) => {
		const original = await dismissalData(lang);
		// A Polish direct realization may also form this legitimate shared expression.
		if (!original.parts[0].gloss.segments.s03.alignments) {
			const alignment = {
				words: ['w005', 'w006'],
				forms: ['spíritu', 'tuo'],
				gloss: 'duchem twoim',
				anchor: 'w005'
			};
			original.parts[0].gloss.segments.s03.alignments = [alignment];
			original.parts[0].gloss.words.w005 = { alignment };
			original.parts[0].gloss.words.w006 = { alignment };
		}
		const changed = structuredClone(original);
		mutate(changed);
		expect(() => validateDismissalPack(changed, lang)).toThrow();
		expect(validateDismissalPack(original, lang)).toEqual(original);
	});
}

it('accepts a declared zero structure and rejects an unknown reason', async () => {
	const pack = await dismissalData('en');
	const zero = { words: ['w007'], forms: ['Ite'], reason: 'inflection' as const };
	pack.parts[0].gloss.segments.s05.alignments = [zero];
	pack.parts[0].gloss.words.w007 = { alignment: zero };
	expect(validateDismissalPack(pack, 'en')).toBe(pack);
	const malformed = structuredClone(pack);
	malformed.parts[0].gloss.segments.s05.alignments![0].reason = 'absent' as 'inflection';
	expect(() => validateDismissalPack(malformed, 'en')).toThrow();
});

it('accepts equivalent alignment fields in a different JSON property order', async () => {
	const pack = await dismissalData('en');
	const alignment = pack.parts[0].gloss.segments.s03.alignments![0];
	pack.parts[0].gloss.words.w006.alignment = {
		anchor: alignment.anchor,
		gloss: alignment.gloss,
		forms: alignment.forms,
		words: alignment.words
	};
	expect(validateDismissalPack(pack, 'en')).toBe(pack);
});
