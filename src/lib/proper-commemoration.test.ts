import { expect, it, vi } from 'vitest';
vi.mock('$lib/storage', () => ({ readStored: () => null, writeStored: () => {} }));
vi.mock('$app/environment', () => ({ browser: true, dev: false }));
import type { MassForm, TextDocument } from './corpus';
import type { Lang } from './i18n';
import { canonData, commemorationData, dismissalData, properData } from './loaders';
import { artifactPath } from './proprium';
import { commemorationName } from './commemorationes';
import { M } from './i18n';
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
			{ situation: 'lecta', described: false, unavailable: [], missing: [] }
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
			{ situation: 'cantu-conventualis', described: true, unavailable: [], missing: [] },
			{ situation: 'cantu-non-conventualis', described: true, unavailable: [], missing: [] }
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
		{ situation: 'cantu-conventualis', described: false, unavailable: [], missing: [] }
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
	['2026-05-31', []],
	// Every impeded Sunday falls on a date whose feast is represented: it is never announced
	// as a commemoration of a day without its Mass.
	['2026-11-01', []],
	['2043-11-01', []],
	// The impeded feast is ordinary and its Sunday's Mass is represented: never announced.
	['2026-12-27', []],
	['2027-07-25', []],
	// The Advent feria is privileged, but every one of its dates has its feast's Mass, the Ember
	// days included: never announced as a day without its Mass.
	['2026-12-08', []],
	['2029-12-21', []]
])(
	'%s announces only a privileged occurrence on a date without a represented Mass',
	async (date, ids) => {
		transport('pl', []);
		await chooseDay({ date, mass: null }, 'pl');
		expect(proper.occurrences.map(({ id }) => id)).toEqual(ids);
	}
);

const ALL_SAINTS = 'omnium-sanctorum';
const XXIII = 'dominica-xxiii-post-pentecosten';
const RESUMED = 'dominica-iv-quae-superfuit-post-epiphaniam';

/** One dated Mass in one form, with only the named formularies' days on the transport. */
async function assemble(
	lang: Lang,
	date: string,
	mass: string,
	chosen: MassForm,
	served: string[]
) {
	transport(lang, served);
	(await form()).set(chosen);
	await chooseDay({ date, mass }, lang);
}

const said = (slot: string) =>
	proper
		.forSlot(slot)
		.map(({ key, commemoration, formulary, situation, nonfinal }) => [
			key,
			commemoration ?? null,
			formulary ?? null,
			situation ?? null,
			nonfinal ?? false
		]);

const requested = () => vi.mocked(fetch).mock.calls.map(([url]) => String(url));

for (const lang of ['pl', 'en'] as const)
	it.each(['lecta', 'cantu'] as const)(
		`${lang} %s Mass of All Saints 2026 commemorates the 23rd Sunday after Pentecost`,
		async (chosen) => {
			await assemble(lang, '2026-11-01', ALL_SAINTS, chosen, [ALL_SAINTS, XXIII]);
			expect(proper.failed).toBe(false);
			// Privileged: one sequence in every Mass, the same in both sung situations.
			expect(proper.commemorationVariants).toEqual([
				{
					situation: chosen === 'lecta' ? 'lecta' : 'cantu-conventualis',
					described: false,
					unavailable: [],
					missing: []
				}
			]);
			for (const slot of ['collecta', 'secreta', 'postcommunio'])
				expect(said(slot), slot).toEqual([
					[`proprium/${ALL_SAINTS}-${slot}`, null, null, null, slot === 'secreta'],
					[`proprium/${XXIII}-${slot}`, 'dominica-impedita', XXIII, null, false]
				]);
			// RG 480–481: every verse of the feast's Secret is the celebrant's, said quietly; the
			// Sunday's Secret, the last, keeps its audible ending and the server's Amen.
			expect(tail('secreta', 0).map(([, speaker, voice]) => `${speaker} ${voice}`)).toEqual(
				Array(3).fill('sacerdos secreto')
			);
			expect(tail('secreta', 1).at(-1)).toEqual(['s03', 'minister', 'clara']);
			// The Sunday's orations come with its own day, never from the shared pack.
			expect(requested()).toContain(artifactPath(XXIII, lang));
			expect(requested().some((url) => url.includes('/commemorationes/'))).toBe(false);
			for (const slot of ['introitus', 'evangelium', 'communio'])
				expect(proper.forSlot(slot).map(({ key }) => key)).toEqual([
					`proprium/${ALL_SAINTS}-${slot}`
				]);
		}
	);

it('says the resumed Fourth Sunday after Epiphany on All Saints 2043 (RG 18)', async () => {
	await assemble('en', '2043-11-01', ALL_SAINTS, 'lecta', [ALL_SAINTS, RESUMED]);
	expect(proper.failed).toBe(false);
	expect(said('collecta')).toEqual([
		[`proprium/${ALL_SAINTS}-collecta`, null, null, null, false],
		['proprium/dominica-iv-post-epiphaniam-collecta', 'dominica-impedita', RESUMED, null, false]
	]);
	expect(said('postcommunio').at(-1)?.[0]).toBe(
		'proprium/dominica-iv-post-epiphaniam-postcommunio'
	);
});

it('keeps the Mass incomplete when the commemorated Sunday cannot be had', async () => {
	await assemble('pl', '2026-11-01', ALL_SAINTS, 'lecta', [ALL_SAINTS]);
	expect(proper.failed).toBe(true);
	expect(proper.payload).toBeNull();
	expect(proper.forSlot('collecta')).toEqual([]);
});

it('owes a commemorated Sunday whose orations this edition lacks, never none', async () => {
	// The contract allows the pair unavailable in all three situations with its formulary
	// named; no such pair is published, so the resource is changed for this one test.
	const owed = structuredClone((await import('./data/commemorationes.json')).default);
	const impeded = owed.commemorations.findIndex(({ id }) => id === 'dominica-impedita');
	const unavailable = owed.decisions.findIndex(
		({ id }) => id === 'omitted-required-de-tempore-unavailable'
	);
	const row = (owed.pairs as (string | number | null)[][]).find(
		(pair) => pair[0] === '2026-11-01' && pair[2] === impeded
	)!;
	row.splice(4, 3, unavailable, unavailable, unavailable);
	vi.resetModules();
	vi.doMock('./data/commemorationes.json', () => ({ default: owed }));
	try {
		const state = await import('./proper.svelte');
		state.proper.clear();
		transport('en', [ALL_SAINTS]);
		(await import('./mass-form.svelte')).massForm.set('lecta');
		await state.chooseDay({ date: '2026-11-01', mass: ALL_SAINTS }, 'en');
		expect(state.proper.failed).toBe(false);
		expect(
			state.proper.commemorationVariants.map(({ unavailable: omitted, missing }) => [
				omitted.length,
				missing.map(({ commemoration, formulary }) => [commemoration.id, formulary])
			])
		).toEqual([[0, [['dominica-impedita', XXIII]]]]);
		expect(state.proper.forSlot('collecta').map(({ key }) => key)).toEqual([
			`proprium/${ALL_SAINTS}-collecta`
		]);
		// The owed Sunday's Secret would follow, so the feast's own is not the last.
		expect(state.proper.forSlot('secreta').map(({ nonfinal }) => nonfinal)).toEqual([true]);
	} finally {
		vi.doUnmock('./data/commemorationes.json');
	}
});

const FESTUM = 'festum-impeditum';
// Two second-class feasts kept off their day by a second-class Sunday: St John by the Sunday
// within the Christmas octave in 2026, St James by the Tenth after Pentecost in 2027.
const IMPEDED_FEASTS = [
	{
		date: '2026-12-27',
		sunday: 'dominica-infra-octavam-nativitatis',
		feast: 'sancti-ioannis-apostoli-et-evangelistae'
	},
	{ date: '2027-07-25', sunday: 'dominica-x-post-pentecosten', feast: 'sancti-iacobi-apostoli' }
] as const;
const SLOTS = ['collecta', 'secreta', 'postcommunio'] as const;

for (const { date, sunday, feast } of IMPEDED_FEASTS)
	for (const lang of ['pl', 'en'] as const) {
		it(`${lang} low Mass of ${sunday} on ${date} commemorates ${feast}`, async () => {
			await assemble(lang, date, sunday, 'lecta', [sunday, feast]);
			expect(proper.failed).toBe(false);
			expect(proper.commemorationVariants).toEqual([
				{ situation: 'lecta', described: false, unavailable: [], missing: [] }
			]);
			for (const slot of SLOTS)
				expect(said(slot), slot).toEqual([
					[`proprium/${sunday}-${slot}`, null, null, null, slot === 'secreta'],
					[`proprium/${feast}-${slot}`, FESTUM, feast, null, false]
				]);
			// RG 480–481: the Sunday's Secret is not the last and ends quietly; the feast's, the
			// last, keeps its audible ending and the server's Amen.
			const [quiet, last] = [tail('secreta', 0), tail('secreta', 1)];
			expect(quiet).toHaveLength(3);
			expect(new Set(quiet.map(([, speaker, voice]) => `${speaker} ${voice}`))).toEqual(
				new Set(['sacerdos secreto'])
			);
			expect(last[last.length - 1]).toEqual(['s03', 'minister', 'clara']);
			// The feast's orations come with its own day, never from the shared pack.
			const urls = requested();
			expect(urls).toContain(artifactPath(feast, lang));
			expect(urls.filter((url) => url.includes('/commemorationes/'))).toEqual([]);
			for (const other of ['introitus', 'evangelium', 'communio'])
				expect(
					proper.forSlot(other).map(({ key }) => key),
					other
				).toEqual([`proprium/${sunday}-${other}`]);
		});

		it(`${lang} sung Mass of ${sunday} on ${date} describes the conventual and the other`, async () => {
			await assemble(lang, date, sunday, 'cantu', [sunday, feast]);
			expect(proper.failed).toBe(false);
			// Ordinary: made in a sung conventual Mass, omitted in one that is not conventual, and
			// the reader's sung choice cannot say which, so both are described.
			const described = (situation: string) => ({
				situation,
				described: true,
				unavailable: [],
				missing: []
			});
			expect(proper.commemorationVariants).toEqual(
				['cantu-conventualis', 'cantu-non-conventualis'].map(described)
			);
			for (const slot of SLOTS) {
				expect(said(slot), slot).toEqual([
					[`proprium/${sunday}-${slot}`, null, null, 'cantu-conventualis', slot === 'secreta'],
					[`proprium/${feast}-${slot}`, FESTUM, feast, 'cantu-conventualis', false],
					[`proprium/${sunday}-${slot}`, null, null, 'cantu-non-conventualis', false]
				]);
				expect(
					proper.forSlot(slot).map(({ slug }) => slug),
					slot
				).toEqual([`${sunday}-${slot}`, `${feast}-${slot}`, `${sunday}-${slot}${OTHER}`]);
			}
			// Without the commemoration the Sunday's own Secret is the last, said aloud.
			expect(tail('secreta', 2).at(-1)).toEqual(['s03', 'minister', 'clara']);
			const anchors = proper.forSlot('collecta').map(({ anchor }) => anchor);
			expect(new Set(anchors).size).toBe(anchors.length);
			// A change of form selects the low sequence again; nothing of the sung variants remains.
			(await form()).set('lecta');
			expect(said('collecta')).toEqual([
				[`proprium/${sunday}-collecta`, null, null, null, false],
				[`proprium/${feast}-collecta`, FESTUM, feast, null, false]
			]);
		});
	}

it('keeps the Mass incomplete when the commemorated feast cannot be had', async () => {
	const [{ date, sunday }] = IMPEDED_FEASTS;
	await assemble('en', date, sunday, 'lecta', [sunday]);
	expect(proper.failed).toBe(true);
	expect(proper.payload).toBeNull();
	expect(proper.forSlot('collecta')).toEqual([]);
});

it('says the Chair of St Peter’s composite Collect, its rubric inside, at Sexagesima 2060', async () => {
	const chair = 'cathedra-sancti-petri';
	const sexagesima = 'dominica-in-sexagesima';
	await assemble('pl', '2060-02-22', sexagesima, 'lecta', [sexagesima, chair]);
	expect(proper.failed).toBe(false);
	expect(said('collecta')).toEqual([
		[`proprium/${sexagesima}-collecta`, null, null, null, false],
		[`proprium/${chair}-collecta`, FESTUM, chair, null, false]
	]);
	// St Paul's oration follows St Peter's under one conclusion, with the printed rubric between.
	expect(
		(proper.forSlot('collecta')[1].doc as TextDocument).segments.map(
			({ id, type }) => `${id} ${type}`
		)
	).toEqual(['s01 verse', 's03 rubric', 's04 verse', 's02 verse']);
});

it('says the Visitation’s Postcommunion for the Nativity of Our Lady in 2030', async () => {
	const nativity = 'nativitas-beatae-mariae-virginis';
	const xiii = 'dominica-xiii-post-pentecosten';
	await assemble('en', '2030-09-08', xiii, 'lecta', [xiii, nativity]);
	expect(proper.failed).toBe(false);
	expect(said('postcommunio')).toEqual([
		[`proprium/${xiii}-postcommunio`, null, null, null, false],
		['proprium/visitatio-beatae-mariae-virginis-postcommunio', FESTUM, nativity, null, false]
	]);
});

const FERIA = 'feria-adventus';
// The Advent feria: the Immaculate Conception on Tuesday 8 December 2026 commemorates the weekday
// with the Second Sunday of Advent's orations, and St Thomas on Friday 21 December 2029, the Ember
// Friday, owes the weekday whose own Mass this edition does not yet author.
const ADVENT = {
	feast: 'immaculata-conceptio',
	sunday: 'dominica-ii-adventus',
	thomas: 'sancti-thomae-apostoli',
	ember: 'feria-sexta-quatuor-temporum-adventus'
} as const;
const sequence = () =>
	proper.commemorationVariants.map(({ situation, described, unavailable, missing }) => ({
		situation,
		described,
		omitted: unavailable.map(({ id }) => id),
		owed: missing.map(({ commemoration, formulary }) => `${commemoration.id} ${formulary}`)
	}));

for (const lang of ['pl', 'en'] as const)
	for (const chosen of ['lecta', 'cantu'] as const) {
		const situation = chosen === 'lecta' ? 'lecta' : 'cantu-conventualis';

		it(`${lang} ${chosen}: the Immaculate Conception 2026 says the Advent weekday from the Second Sunday`, async () => {
			await assemble(lang, '2026-12-08', ADVENT.feast, chosen, [ADVENT.feast, ADVENT.sunday]);
			expect(proper.failed).toBe(false);
			// Privileged: one sequence in every form of Mass, nothing omitted or owed.
			expect(sequence()).toEqual([{ situation, described: false, omitted: [], owed: [] }]);
			for (const slot of SLOTS) {
				const rows = said(slot);
				expect(rows.length, slot).toBe(2);
				expect(rows[0], slot).toEqual([
					`proprium/${ADVENT.feast}-${slot}`,
					null,
					null,
					null,
					slot === 'secreta'
				]);
				expect(rows[1], slot).toEqual([
					`proprium/${ADVENT.sunday}-${slot}`,
					FERIA,
					ADVENT.sunday,
					null,
					false
				]);
			}
			// RG 480–481: the feast's Secret ends quietly. The Sunday's, the last, keeps its audible
			// terminal and the server's Amen.
			expect([
				...new Set(tail('secreta', 0).map(([, speaker, voice]) => `${speaker}/${voice}`))
			]).toEqual(['sacerdos/secreto']);
			expect(tail('secreta', 1).slice(1)).toEqual([
				['s02', 'sacerdos', 'clara'],
				['s03', 'minister', 'clara']
			]);
			// The Sunday's orations come with its own day, never from the shared pack.
			expect(requested()).toContain(artifactPath(ADVENT.sunday, lang));
			expect(requested().filter((url) => url.includes('/commemorationes/'))).toHaveLength(0);
		});

		it(`${lang} ${chosen}: St Thomas on the Ember Friday 2029 owes the Advent weekday, never the Sunday's`, async () => {
			await assemble(lang, '2029-12-21', ADVENT.thomas, chosen, [ADVENT.thomas]);
			// The Mass is complete as far as this edition goes, and says what it owes.
			expect(proper.failed).toBe(false);
			expect(sequence()).toEqual([
				{ situation, described: false, omitted: [], owed: [`${FERIA} ${ADVENT.ember}`] }
			]);
			// Only St Thomas's own orations: the Ember day's are not in this edition, and the
			// preceding Sunday's are not put in their place.
			for (const slot of SLOTS)
				expect(said(slot), slot).toEqual([
					[`proprium/${ADVENT.thomas}-${slot}`, null, null, null, slot === 'secreta']
				]);
			// The owed weekday's Secret would follow, so St Thomas's ends quietly.
			expect(tail('secreta', 0).at(-1)).toEqual(['s03', 'sacerdos', 'secreto']);
			expect(requested()).toContain(artifactPath(ADVENT.thomas, lang));
			expect(
				requested().filter(
					(url) => url.includes('quatuor-temporum') || url.includes('/commemorationes/')
				)
			).toEqual([]);
			// The day notice names the weekday by its own title, as the picker builds it.
			const [{ missing }] = proper.commemorationVariants;
			expect(
				M[lang].dayCommemorationMissing.replace(
					'{title}',
					commemorationName(missing[0].commemoration.id, missing[0].formulary, lang)
				)
			).toBe(
				lang === 'pl'
					? 'tego dnia przypada wspomnienie: Dzień powszedni Adwentu. Jego modlitw nie ma jeszcze w\u00a0tym wydaniu'
					: 'a commemoration is due on this day: Weekday of Advent. Its prayers are not yet in this edition'
			);
		});
	}

it('keeps the Mass incomplete when the Sunday the Advent weekday says cannot be had', async () => {
	await assemble('pl', '2026-12-08', ADVENT.feast, 'lecta', [ADVENT.feast]);
	expect(proper.failed).toBe(true);
	expect(proper.payload).toBeNull();
	expect(proper.forSlot('postcommunio')).toEqual([]);
});
