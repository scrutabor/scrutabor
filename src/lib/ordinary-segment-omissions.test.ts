import { expect, it } from 'vitest';
import { loadText } from './corpus';
import { FORMULARY_METADATA } from './corpus-metadata';
import type { Lang } from './i18n';
import { settledSelection, unresolvedPayloadCases } from './ordinary-test-fixtures';
import { readingPayloadReady } from './reading-announcements';
import { dayById } from './proprium';
import { resolveOrdoChoice } from './ordo-choice';
import { resolveCompositeAddress } from './reading-address';
import { indexOccurrenceWords } from './proper-occurrences';
import { textFlowFor } from './reading-flow';
import {
	ordinarySegmentView,
	omittedOrdinaryCitation,
	validateOrdinarySegmentOmissions
} from './ordinary-segment-omissions';

const CASES = [
	['2026-03-15', 'dominica-iv-in-quadragesima', false],
	['2026-03-22', 'dominica-i-passionis', true],
	['2026-03-25', 'annuntiatio-beatae-mariae-virginis', false],
	['2026-03-29', 'dominica-ii-passionis', true],
	['2026-04-02', 'feria-v-in-cena-domini', true],
	['2026-04-04', 'vigilia-paschalis', false],
	['2026-04-05', 'dominica-resurrectionis', false],
	['2026-11-02', 'commemoratio-omnium-fidelium-defunctorum', true],
	['2026-11-02', 'commemoratio-omnium-fidelium-defunctorum-missa-ii', true],
	['2026-11-02', 'commemoratio-omnium-fidelium-defunctorum-missa-iii', true]
] as const;
const FULL = Array.from({ length: 94 }, (_, i) => `w${String(i + 1).padStart(3, '0')}`);
const descriptor = () => [
	{ text: 'ordinarium/lavabo', segments: ['s09', 's10'], reason: 'lavabo-doxology' }
];
async function body(lang: Lang) {
	const entry = (await loadText('ordinarium/lavabo', lang))!;
	return {
		key: 'ordinarium/lavabo',
		slug: 'lavabo',
		anchor: 'text-ordinarium-lavabo',
		doc: entry.text,
		gloss: entry.gloss
	};
}

it('receives exactly six canonical omission declarations and no added calendar rule', () => {
	expect(
		FORMULARY_METADATA.filter((day) => day.ordinary_omissions.length)
			.map((day) => day.id)
			.sort()
	).toEqual(
		CASES.filter((row) => row[2])
			.map((row) => row[1])
			.sort()
	);
	for (const day of FORMULARY_METADATA)
		expect(validateOrdinarySegmentOmissions(day.ordinary_omissions)).toBe(day.ordinary_omissions);
});

it.each(CASES)(
	'uses the actual selected %s/%s prescription without changing its owner',
	async (date, mass, omitted) => {
		expect(resolveOrdoChoice(date, mass)).toEqual({ date, mass });
		for (const lang of ['pl', 'en'] as const) {
			const original = await body(lang);
			const saved = structuredClone(original);
			const state = settledSelection(date, mass, lang);
			expect(readingPayloadReady(state, lang)).toBe(true);
			const view = ordinarySegmentView('lavabo', original, dayById(mass)!.ordinary_omissions, true);
			expect(view.omitted).toEqual(omitted ? ['s09', 's10'] : []);
			expect(view.body.doc.segments.flatMap((s) => s.words ?? []).map((w) => w.id)).toEqual(
				omitted ? FULL.slice(0, 74) : FULL
			);
			expect(view.body.gloss).toBe(original.gloss);
			expect(original).toEqual(saved);
			if (!omitted) expect(view.body).toBe(original);
			else expect(view.body.doc.segments).toEqual(original.doc.segments.slice(0, 8));
		}
	}
);

it.each(['pl', 'en'] as const)(
	'%s keeps every real retained word card and flow edge',
	async (lang) => {
		const original = await body(lang);
		const view = ordinarySegmentView('lavabo', original, descriptor(), true);
		const indexed = indexOccurrenceWords([view.body]);
		expect([...indexed.keys()]).toEqual(FULL.slice(0, 74).map((id) => `lavabo.${id}`));
		for (const id of FULL.slice(0, 74)) {
			const word = original.doc.segments.flatMap((s) => s.words ?? []).find((w) => w.id === id)!;
			expect(indexed.get(`lavabo.${id}`)?.word).toBe(word);
			expect(view.body.gloss.words[id]).toBe(original.gloss.words[id]);
		}
		for (const helpLevel of [0, 1, 2])
			for (const form of ['lecta', 'cantu'] as const) {
				const flow = textFlowFor(view.body.doc, view.body.gloss, { helpLevel }, form, 'sacerdos');
				const rows = [...flow.opening, ...flow.continuation].flatMap((unit) => unit.rows);
				expect(rows.map((row) => row.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
				expect(flow.last?.index).toBe(7);
				expect(view.body.doc.segments[flow.last!.row.primary].id).toBe('s08');
			}
	}
);

it.each(['pl', 'en'] as const)(
	'%s uses the current metadata leaf, not a remembered season decision',
	async (lang) => {
		const original = await body(lang);
		const day = dayById('dominica-ii-passionis')!;
		const prescribed = day.ordinary_omissions;
		const count = () =>
			ordinarySegmentView(
				'lavabo',
				original,
				day.ordinary_omissions,
				true
			).body.doc.segments.flatMap((segment) => segment.words ?? []).length;
		expect(count()).toBe(74);
		try {
			// An empty list is structurally valid: this API must not invent a calendar rule.
			day.ordinary_omissions = [];
			expect(count()).toBe(94);
		} finally {
			day.ordinary_omissions = prescribed;
		}
		expect(day.ordinary_omissions).toBe(prescribed);
		expect(count()).toBe(74);
	}
);

const UNREADY = [
	['no date', { date: null }],
	['invalid date', { date: '2026-02-30' }],
	['foreign date', { date: '2026-04-26' }],
	['Ordinary only', { mass: null, loadedMass: null }],
	['wrong language', { loadedLanguage: 'pl' }],
	...unresolvedPayloadCases
] as const;
it.each(UNREADY)('keeps the complete canonical text while %s and recovers', async (_, patch) => {
	const original = await body('en');
	const state = settledSelection('2026-03-29', 'dominica-ii-passionis', 'en');
	expect(readingPayloadReady(state, 'en')).toBe(true);
	const changed = { ...state, ...patch };
	expect(readingPayloadReady(changed, 'en')).toBe(false);
	const view = ordinarySegmentView(
		'lavabo',
		original,
		descriptor(),
		readingPayloadReady(changed, 'en')
	);
	expect(view.body).toBe(original);
	expect(view.omitted).toEqual([]);
	expect(
		ordinarySegmentView('lavabo', original, descriptor(), readingPayloadReady(state, 'en')).omitted
	).toEqual(['s09', 's10']);
});

it('does not extend whole-hymn omission or hide another Ordinary body', async () => {
	const original = await body('en');
	for (const slot of ['gloria', 'credo', 'collecta', 'secreta', 'postcommunio'])
		expect(ordinarySegmentView(slot, original, descriptor(), true).body).toBe(original);
});

it.each([
	['absent', undefined],
	['null', null],
	['object', {}]
])(
	'rejects an %s prescription container rather than defaulting it to an empty list',
	(_, value) => {
		expect(() => validateOrdinarySegmentOmissions(value)).toThrow(
			'invalid ordinary segment omissions'
		);
	}
);

it.each([
	'missing',
	'null',
	'foreign-target',
	'missing-segment',
	'reversed',
	'extra-segment',
	'reason',
	'extra-field',
	'duplicate'
] as const)('rejects the %s wire mutation and restores the same array', async (fault) => {
	const original = await body('en');
	const rows: unknown[] = descriptor();
	const row = rows[0] as Record<string, unknown>;
	const saved = structuredClone(row);
	expect(ordinarySegmentView('lavabo', original, rows, true).omitted).toHaveLength(2);
	try {
		if (fault === 'missing') delete row.segments;
		if (fault === 'null') rows[0] = null;
		if (fault === 'foreign-target') row.text = 'ordinarium/gloria';
		if (fault === 'missing-segment') row.segments = ['s09'];
		if (fault === 'reversed') row.segments = ['s10', 's09'];
		if (fault === 'extra-segment') row.segments = ['s08', 's09', 's10'];
		if (fault === 'reason') row.reason = 'season';
		if (fault === 'extra-field') row.date = '2026-03-29';
		if (fault === 'duplicate') rows.push(structuredClone(row));
		expect(() => ordinarySegmentView('lavabo', original, rows, true)).toThrow(
			'invalid ordinary segment omission'
		);
	} finally {
		for (const key of Object.keys(row)) delete row[key];
		Object.assign(row, saved);
		rows.splice(0, rows.length, row);
	}
	expect(rows).toEqual(descriptor());
	expect(ordinarySegmentView('lavabo', original, rows, true).omitted).toHaveLength(2);
});

it.each([
	'owner',
	'segment',
	'missing-row',
	'word',
	'boundary',
	'speaker',
	'gloss',
	'translation',
	'morph'
] as const)('rejects a %s complete-body mutation and recovers the same objects', async (fault) => {
	const original = structuredClone(await body('en'));
	const saved = structuredClone(original);
	const segments = original.doc.segments;
	const all = [...segments];
	const word = segments[8].words![0];
	const card = original.gloss.words.w075;
	expect(ordinarySegmentView('lavabo', original, descriptor(), true).omitted).toHaveLength(2);
	try {
		if (fault === 'owner') original.doc.id = 'ordinarium.gloria';
		if (fault === 'segment') segments[8].id = 's11';
		if (fault === 'missing-row') segments.splice(1, 1);
		if (fault === 'word') word.id = 'w999';
		if (fault === 'boundary') segments[8].words!.push(segments[9].words![0]);
		if (fault === 'speaker') segments[8].speaker = 'populus';
		if (fault === 'gloss') delete original.gloss.words.w075;
		if (fault === 'translation') original.gloss.segments.s09.translation = '';
		if (fault === 'morph') word.morph.pos = '';
		expect(() => ordinarySegmentView('lavabo', original, descriptor(), true)).toThrow(
			'ordinary omission has no complete canonical body'
		);
	} finally {
		original.doc.id = saved.doc.id;
		segments.splice(0, segments.length, ...all);
		segments[8].id = 's09';
		word.id = 'w075';
		segments[8].words!.splice(7);
		segments[8].speaker = 'sacerdos';
		original.gloss.words.w075 = card;
		original.gloss.segments.s09.translation = saved.gloss.segments.s09.translation;
		word.morph.pos = saved.doc.segments[8].words![0].morph.pos;
	}
	expect(original).toEqual(saved);
	expect(ordinarySegmentView('lavabo', original, descriptor(), true).omitted).toHaveLength(2);
});

it.each([
	['lavabo.w075', null, '?w=w075'],
	['lavabo.w094', null, '?w=w094'],
	[null, 'lavabo.s09', '?s=s09'],
	[null, 'lavabo.s08-s10', '?s=s08-s10'],
	['lavabo.w074', 'lavabo.s08-s09', '?w=w074&s=s08-s09']
])(
	'preserves omitted intent %s/%s for the canonical study page and retained transition',
	async (word, segment, query) => {
		const original = await body('en');
		const view = ordinarySegmentView('lavabo', original, descriptor(), true);
		expect(omittedOrdinaryCitation(original, view, word, segment, '')).toEqual({ query });
		const shown = resolveCompositeAddress([view.body], word, segment, '');
		if (word && word !== 'lavabo.w074') expect(shown.word).toBeNull();
		expect(shown.segments.every((id) => !view.omitted.includes(id))).toBe(true);
		const retained = ordinarySegmentView('lavabo', original, [], true);
		expect(retained.body).toBe(original);
		expect(omittedOrdinaryCitation(original, retained, word, segment, '')).toBeNull();
		const recovered = resolveCompositeAddress([retained.body], word, segment, '');
		if (word) expect(recovered.word).toBe(word);
		if (segment) expect(recovered.segment).toBe(segment);
	}
);

it.each(['lavabo.w001', 'lavabo.w074', 'lavabo.w999', 'other.w075'])(
	'does not mislabel %s as an omitted citation',
	async (word) => {
		const original = await body('en');
		const view = ordinarySegmentView('lavabo', original, descriptor(), true);
		expect(omittedOrdinaryCitation(original, view, word, null, '')).toBeNull();
	}
);
