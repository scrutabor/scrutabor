import { expect, it, vi } from 'vitest';
vi.mock('$lib/storage', () => ({ readStored: () => null, writeStored: () => {} }));
vi.mock('$app/environment', () => ({ browser: true, dev: false }));
import type { TextDocument } from './corpus';
import type { Lang } from './i18n';
import { canonData, commemorationData, dismissalData, properData } from './loaders';
import { useFreshProperState } from './proper-test-context';

let chooseDay: (typeof import('./proper.svelte'))['chooseDay'];
let proper: (typeof import('./proper.svelte'))['proper'];
useFreshProperState((state) => {
	({ chooseDay, proper } = state);
});

const QUEEN = 'beata-maria-virgo-regina';
const MARK = 'sancti-marci-evangelistae';
const OTHER = '~cantu-non-conventualis';

// The three shared transport packs by the path segment that names them.
const PACKS = { canon: canonData, dismissal: dismissalData, commemorationes: commemorationData };

function transport(lang: Lang, masses: string[], commemorations = true) {
	const respond = async (url: string) => {
		const pack = (Object.keys(PACKS) as (keyof typeof PACKS)[]).find((name) =>
			url.includes(`/${name}/`)
		);
		if (pack === 'commemorationes' && !commemorations)
			return { ok: false, status: 503, json: async () => ({}) };
		const body = pack
			? await PACKS[pack](lang)
			: {
					days: Object.fromEntries(
						await Promise.all(masses.map(async (mass) => [mass, await properData(mass, lang)]))
					)
				};
		return { ok: true, json: async () => body };
	};
	vi.stubGlobal('fetch', vi.fn(respond));
}

/** The mass form store of the fresh module graph proper.svelte was loaded with. */
async function form() {
	return (await import('./mass-form.svelte')).massForm;
}

const shape = (slot: string) =>
	proper
		.forSlot(slot)
		.map(({ key, slug, commemoration, situation, nonfinal }) => [
			key,
			slug,
			commemoration ?? null,
			situation ?? null,
			nonfinal ?? false
		]);

const tail = (slot: string, index: number) =>
	(proper.forSlot(slot)[index].doc as TextDocument).segments.map(({ id, speaker, voice }) => [
		id,
		speaker,
		voice
	]);

it.each(['pl', 'en'] as const)(
	'%s low Mass of the Queenship makes St Petronilla’s commemoration in one sequence',
	async (lang) => {
		transport(lang, [QUEEN]);
		const massForm = await form();
		massForm.set('lecta');
		await chooseDay({ date: '2027-05-31', mass: QUEEN }, lang);
		expect(proper.failed).toBe(false);
		expect(proper.commemorationVariants).toEqual([
			{ situation: 'lecta', described: false, unavailable: [] }
		]);
		expect(shape('collecta')).toEqual([
			[`proprium/${QUEEN}-collecta`, `${QUEEN}-collecta`, null, null, false],
			[
				'proprium/sanctae-petronillae-collecta',
				'sanctae-petronillae-collecta',
				'sancta-petronilla',
				null,
				false
			]
		]);
		expect(shape('secreta')).toEqual([
			[`proprium/${QUEEN}-secreta`, `${QUEEN}-secreta`, null, null, true],
			[
				'proprium/sanctae-petronillae-secreta',
				'sanctae-petronillae-secreta',
				'sancta-petronilla',
				null,
				false
			]
		]);
		// RG 480–481: the Mass's Secret ends quietly; St Petronilla's keeps its audible ending.
		expect(tail('secreta', 0)).toEqual([
			['s01', 'sacerdos', 'secreto'],
			['s02', 'sacerdos', 'secreto'],
			['s03', 'sacerdos', 'secreto']
		]);
		expect(tail('secreta', 1).at(-2)).toEqual(['s03', 'sacerdos', 'clara']);
		expect(tail('secreta', 1).at(-1)).toEqual(['s04', 'minister', 'clara']);
	}
);

it.each(['pl', 'en'] as const)(
	'%s sung Mass of the Queenship describes the conventual and the other sequence',
	async (lang) => {
		transport(lang, [QUEEN]);
		const massForm = await form();
		massForm.set('cantu');
		await chooseDay({ date: '2027-05-31', mass: QUEEN }, lang);
		expect(proper.commemorationVariants).toEqual([
			{ situation: 'cantu-conventualis', described: true, unavailable: [] },
			{ situation: 'cantu-non-conventualis', described: true, unavailable: [] }
		]);
		expect(shape('collecta')).toEqual([
			[`proprium/${QUEEN}-collecta`, `${QUEEN}-collecta`, null, 'cantu-conventualis', false],
			[
				'proprium/sanctae-petronillae-collecta',
				'sanctae-petronillae-collecta',
				'sancta-petronilla',
				'cantu-conventualis',
				false
			],
			[
				`proprium/${QUEEN}-collecta`,
				`${QUEEN}-collecta${OTHER}`,
				null,
				'cantu-non-conventualis',
				false
			]
		]);
		expect(
			shape('secreta').map(([, slug, , situation, nonfinal]) => [slug, situation, nonfinal])
		).toEqual([
			[`${QUEEN}-secreta`, 'cantu-conventualis', true],
			['sanctae-petronillae-secreta', 'cantu-conventualis', false],
			[`${QUEEN}-secreta${OTHER}`, 'cantu-non-conventualis', false]
		]);
		// The sequence that is not conventual keeps the Mass's own Secret as the last, audibly.
		expect(tail('secreta', 2).at(-1)).toEqual(['s03', 'minister', 'clara']);
		const anchors = proper.forSlot('postcommunio').map(({ anchor }) => anchor);
		expect(new Set(anchors).size).toBe(anchors.length);
		// Slots no commemoration answers are one sequence, with their plain addresses.
		for (const slot of ['introitus', 'evangelium', 'communio'])
			for (const part of proper.forSlot(slot)) {
				expect(part.situation, slot).toBeUndefined();
				expect(part.slug, slot).not.toContain('~');
			}
		// A change of form selects the other assembly; nothing of the sung variants remains.
		massForm.set('lecta');
		expect(shape('collecta').map(([, slug, , situation]) => [slug, situation])).toEqual([
			[`${QUEEN}-collecta`, null],
			['sanctae-petronillae-collecta', null]
		]);
	}
);

it.each(['pl', 'en'] as const)(
	'%s 31 May 2079 owes a de Tempore commemoration this edition lacks, never none',
	async (lang) => {
		transport(lang, [QUEEN]);
		const massForm = await form();
		massForm.set('lecta');
		await chooseDay({ date: '2079-05-31', mass: QUEEN }, lang);
		expect(proper.failed).toBe(false);
		expect(
			proper.commemorationVariants.map(({ situation, described, unavailable }) => [
				situation,
				described,
				unavailable.map(({ id }) => id)
			])
		).toEqual([['lecta', false, ['sancta-petronilla']]]);
		expect(shape('collecta')).toEqual([
			[`proprium/${QUEEN}-collecta`, `${QUEEN}-collecta`, null, null, false]
		]);
		// The owed commemoration's Secret would follow, so the Mass's own is not the last.
		expect(shape('secreta')).toEqual([
			[`proprium/${QUEEN}-secreta`, `${QUEEN}-secreta`, null, null, true]
		]);
		massForm.set('cantu');
		expect(
			proper.commemorationVariants.map(({ situation, described, unavailable }) => [
				situation,
				described,
				unavailable.map(({ id }) => id)
			])
		).toEqual([
			['cantu-conventualis', true, ['sancta-petronilla']],
			['cantu-non-conventualis', true, []]
		]);
		expect(
			shape('secreta').map(([, slug, , situation, nonfinal]) => [slug, situation, nonfinal])
		).toEqual([
			[`${QUEEN}-secreta`, 'cantu-conventualis', true],
			[`${QUEEN}-secreta${OTHER}`, 'cantu-non-conventualis', false]
		]);
	}
);

it('keeps a privileged commemoration as one sung sequence', async () => {
	transport('pl', [MARK]);
	const massForm = await form();
	massForm.set('cantu');
	await chooseDay({ date: '2026-04-25', mass: MARK }, 'pl');
	expect(proper.commemorationVariants).toEqual([
		{ situation: 'cantu-conventualis', described: false, unavailable: [] }
	]);
	expect(
		shape('collecta').map(([, slug, commemoration, situation]) => [slug, commemoration, situation])
	).toEqual([
		[`${MARK}-collecta`, null, null],
		['litaniae-maiores-collecta', 'litaniae-maiores', null]
	]);
});

it('keeps the Mass incomplete when St Petronilla’s orations cannot be fetched', async () => {
	transport('en', [QUEEN], false);
	(await form()).set('lecta');
	await chooseDay({ date: '2027-05-31', mass: QUEEN }, 'en');
	expect(proper.failed).toBe(true);
	expect(proper.payload).toBeNull();
	expect(proper.forSlot('collecta')).toEqual([]);
	expect(proper.commemorationVariants).toEqual([]);
});

it.each([
	['2030-04-25', ['litaniae-maiores']],
	['2034-05-31', []],
	['2026-04-25', []],
	['2026-05-31', []]
])(
	'%s announces only a privileged occurrence on a date without a represented Mass',
	async (date, ids) => {
		transport('pl', []);
		await chooseDay({ date, mass: null }, 'pl');
		expect(proper.occurrences.map(({ id }) => id)).toEqual(ids);
	}
);
