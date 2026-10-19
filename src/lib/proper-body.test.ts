import { expect, it, vi } from 'vitest';
vi.mock('$app/environment', () => ({ browser: true, dev: false }));
vi.mock('$lib/storage', () => ({ readStored: () => null, writeStored: () => {} }));
import { properData, canonData, dismissalData, commemorationData } from './loaders';
import type { Lang } from './i18n';
import { PROPER_DAYS, artifactPath } from './proprium';
import canonTable from './data/canon.json';
import { useFreshProperState } from './proper-test-context';
type Payload = NonNullable<Awaited<ReturnType<typeof properData>>>;
const choice = { date: '2026-04-04', mass: 'vigilia-paschalis' };
let chooseDay: (typeof import('./proper.svelte'))['chooseDay'];
let proper: (typeof import('./proper.svelte'))['proper'];
useFreshProperState((state) => {
	({ chooseDay, proper } = state);
});
function target(p: Payload) {
	const part = p.parts.find((part) =>
		part.doc.segments.some((s) => s.type === 'verse' && (s.words?.length ?? 0) > 1)
	)!;
	return {
		part,
		verse: part.doc.segments.find((s) => s.type === 'verse' && (s.words?.length ?? 0) > 1)!
	};
}
function declareZero(p: Payload, reason: unknown, withGloss = false) {
	const { part, verse } = target(p);
	const word = verse.words!.find(
		(w) => part.gloss.words[w.id].gloss && !part.gloss.words[w.id].alignment
	)!;
	const alignment = {
		words: [word.id],
		forms: [word.form],
		reason: reason as 'idiom',
		...(withGloss ? { gloss: 'invalid' } : {})
	};
	part.gloss.segments[verse.id].alignments = [
		...(part.gloss.segments[verse.id].alignments ?? []),
		alignment
	];
	part.gloss.words[word.id] = { alignment };
}
const mutations: [string, (p: Payload) => void][] = [
	[
		'array segment type',
		(p) => {
			p.parts
				.find((p) => p.key.endsWith('-alleluia'))!
				.doc.segments.find((s) => s.type === 'verse')!.type = ['verse'] as unknown as 'verse';
		}
	],
	['array zero reason', (p) => declareZero(p, ['idiom'])],
	['unknown zero reason', (p) => declareZero(p, 'absent')],
	['zero with gloss', (p) => declareZero(p, 'idiom', true)],
	[
		'duplicate word',
		(p) => {
			const { verse } = target(p);
			verse.words![1].id = verse.words![0].id;
		}
	],
	[
		'duplicate segment',
		(p) => {
			const { part } = target(p);
			part.doc.segments[1].id = part.doc.segments[0].id;
		}
	],
	[
		'unknown type',
		(p) => {
			target(p).verse.type = 'unknown' as 'verse';
		}
	],
	[
		'empty translation',
		(p) => {
			const { part, verse } = target(p);
			part.gloss.segments[verse.id].translation = '';
		}
	],
	[
		'empty direct gloss',
		(p) => {
			const { part, verse } = target(p);
			const word = verse.words!.find((w) => part.gloss.words[w.id].gloss)!;
			part.gloss.words[word.id].gloss = '';
		}
	],
	[
		'empty lemma head',
		(p) => {
			p.lex.lemmata[target(p).verse.words![0].lemma].head = '';
		}
	],
	[
		'empty senses',
		(p) => {
			p.lex.senses[target(p).verse.words![0].lemma].senses = [];
		}
	],
	[
		'empty morphology',
		(p) => {
			target(p).verse.words![0].morph.pos = '';
		}
	],
	[
		'missing lexicon',
		(p) => {
			p.lex = { lemmata: {}, senses: {} };
		}
	],
	[
		'bad group membership',
		(p) => {
			const { part, verse } = target(p);
			part.gloss.segments[verse.id].alignments = [
				{
					words: [verse.words![1].id, verse.words![0].id],
					forms: [verse.words![1].form, verse.words![0].form],
					anchor: verse.words![0].id,
					gloss: 'test'
				}
			];
		}
	],
	[
		'blank word form',
		(p) => {
			target(p).verse.words![0].form = ' ';
		}
	],
	[
		'blank lemma key',
		(p) => {
			target(p).verse.words![0].lemma = ' ';
		}
	],
	[
		'duplicate across verses',
		(p) => {
			const { part, verse } = target(p);
			const other = part.doc.segments.find((s) => s.type === 'verse' && s !== verse);
			if (!other) throw new Error('multi-verse fixture required');
			other.words![0].id = verse.words![0].id;
		}
	],
	[
		'array lexicon',
		(p) => {
			p.lex.lemmata = [] as unknown as typeof p.lex.lemmata;
		}
	],
	[
		'empty rubric narrative',
		(p) => {
			const part = p.parts.find((p) => p.doc.segments.some((s) => s.type === 'rubric'))!;
			const rubric = part.doc.segments.find((s) => s.type === 'rubric')!;
			part.gloss.segments[rubric.id].narrative = '';
		}
	],
	[
		'empty rubric text',
		(p) => {
			const part = p.parts.find((p) => p.doc.segments.some((s) => s.type === 'rubric'))!;
			part.doc.segments.find((s) => s.type === 'rubric')!.text = '';
		}
	],
	[
		'wrong ordered role',
		(p) => {
			p.parts[0].part = 'communio';
		}
	],
	[
		'changed condition',
		(p) => {
			p.parts[0].condition = {
				rubricalSeason: 'paschale'
			} as unknown as (typeof p.parts)[0]['condition'];
		}
	]
];
async function transport(lang: Lang, mutate?: (p: Payload) => void) {
	const original = await properData(choice.mass, lang);
	expect(original).not.toBeNull();
	let n = 0;
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string) => ({
			ok: true,
			json: async () => {
				if (url.includes('/canon/')) return canonData(lang);
				if (url.includes('/dismissal/')) return dismissalData(lang);
				if (url.includes('/commemorationes/')) return commemorationData(lang);
				const body = structuredClone(original!);
				if (++n === 1) mutate?.(body);
				return { days: { [choice.mass]: body } };
			}
		}))
	);
	return () => n;
}
for (const lang of ['pl', 'en'] as const)
	it.each(mutations)(
		'actual ' + lang + ' Proper rejects %s and restores retry',
		async (_, mutate) => {
			const calls = await transport(lang, mutate);
			await chooseDay(choice, lang);
			expect(proper.failed).toBe(true);
			expect(proper.payload).toBeNull();
			expect(proper.day).toBe(choice.mass);
			expect(proper.date).toBe(choice.date);
			await chooseDay(choice, lang);
			expect(calls()).toBe(2);
			expect(proper.failed).toBe(false);
			expect(proper.payload?.day).toBe(choice.mass);
		}
	);

it.each(['pl', 'en'] as const)(
	'actual %s consumer accepts all111 date-indexed forms, including repeated keys',
	async (lang) => {
		const days = Object.fromEntries(
			await Promise.all(PROPER_DAYS.map(async (day) => [day.id, await properData(day.id, lang)]))
		);
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string) => ({
				ok: true,
				json: () =>
					url.includes('/canon/')
						? canonData(lang)
						: url.includes('/dismissal/')
							? dismissalData(lang)
							: url.includes('/commemorationes/')
								? commemorationData(lang)
								: { days }
			}))
		);
		expect(PROPER_DAYS).toHaveLength(113);
		const unindexed: string[] = [];
		let accepted = 0;
		for (const day of PROPER_DAYS) {
			const massIndex = canonTable.masses.indexOf(day.id);
			const pair =
				canonTable.pairs.find(
					(pair) => pair[1] === massIndex && String(pair[0]).startsWith('2026-')
				) ?? canonTable.pairs.find((pair) => pair[1] === massIndex);
			if (!pair) {
				unindexed.push(day.id);
				continue;
			}
			await chooseDay({ date: String(pair![0]), mass: day.id }, lang);
			expect(proper.failed, day.id).toBe(false);
			expect(proper.payload?.day, day.id).toBe(day.id);
			accepted++;
		}
		expect(accepted).toBe(111);
		expect(unindexed).toEqual([
			'dominica-i-post-epiphaniam',
			'dominica-iii-quae-superfuit-post-epiphaniam'
		]);
	}
);

it.each(['pl', 'en'] as const)(
	'actual %s Proper preserves a legitimate zero realization',
	async (lang) => {
		await transport(lang, (p) => declareZero(p, 'idiom'));
		await chooseDay(choice, lang);
		expect(proper.failed).toBe(false);
		expect(proper.payload?.day).toBe(choice.mass);
	}
);

for (const lateBad of [false, true])
	it(
		'superseded ' + (lateBad ? 'invalid' : 'valid') + ' Proper cannot replace a newer choice',
		async () => {
			const newer = { date: '2026-02-22', mass: 'dominica-i-in-quadragesima' };
			let release!: (body: Payload) => void;
			const pending = new Promise<Payload>((resolve) => {
				release = resolve;
			});
			vi.stubGlobal(
				'fetch',
				vi.fn(async (url: string) => ({
					ok: true,
					json: async () => {
						if (url.includes('/canon/')) return canonData('en');
						if (url.includes('/dismissal/')) return dismissalData('en');
						if (url.includes('/commemorationes/')) return commemorationData('en');
						if (url === artifactPath(choice.mass, 'en'))
							return { days: { [choice.mass]: await pending } };
						return { days: { [newer.mass]: await properData(newer.mass, 'en') } };
					}
				}))
			);
			const old = chooseDay(choice, 'en');
			let oldFinished = false;
			void old.then(() => {
				oldFinished = true;
			});
			await vi.waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalled());
			await chooseDay(newer, 'en');
			expect(oldFinished).toBe(false);
			expect(proper.payload?.day).toBe(newer.mass);
			const body = structuredClone((await properData(choice.mass, 'en'))!);
			if (lateBad) mutations.find(([name]) => name === 'duplicate word')![1](body);
			release(body);
			await old;
			expect(proper.failed).toBe(false);
			expect(proper.payload?.day).toBe(newer.mass);
			expect(proper.date).toBe(newer.date);
		}
	);
