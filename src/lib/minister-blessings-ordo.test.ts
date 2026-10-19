import { readFileSync } from 'node:fs';
import { render } from 'svelte/server';
import { expect, it } from 'vitest';
import TextBody from './components/TextBody.svelte';
import { hasText, loadText } from './corpus';
import { ordoData } from './loaders';
import type { Lang } from './i18n';
import { massForm } from './mass-form.svelte';
import { ORDO, partVoice } from './ordo';
import { resolveOrdoChoice } from './ordo-choice';
import {
	ordoBlessingContext,
	ordoEntryVisibility,
	ordoMinisterBlessingContext,
	type GospelPreparationState
} from './ordo-context';
import { expectGospelPreparationOrder, expectParagraphLatin } from './ordo-test-context';
import { flowBinding } from './reading-flow';
import { role, ROLES } from './role.svelte';

const ids = ['iube-domne-benedicere', 'iube-domne-benedicere-in-passione'] as const;
const movement = ORDO.find((item) => item.id === 'catechumenorum')!;
const ordinary = 'dominica-iii-post-pascha';
const passion = 'dominica-ii-passionis';
const gospel = 'proprium/dominica-iii-post-pascha-evangelium';
const passionKey = 'proprium/dominica-ii-passionis-evangelium';
const state = (
	lang: Lang,
	mass: string | null = ordinary,
	date = '2026-04-26'
): GospelPreparationState => ({
	date,
	mass,
	loadedMass: mass,
	loadedLanguage: mass ? lang : null,
	loading: false,
	failed: false,
	unwritten: false
});

it('adds two complete reference alternatives at one first-Gospel preparation locus', () => {
	expectGospelPreparationOrder(movement);
	for (const id of ids) {
		const entries = ORDO.flatMap((item) => item.entries).filter((entry) => entry.id === id);
		expect(entries).toHaveLength(1);
		expect(entries[0]).toMatchObject({ kind: 'text', text: 'ordinarium/' + id });
		expect(entries[0].onlyWhenPresent).toBeUndefined();
		expect(entries[0].quietLabel).toBeUndefined();
		expect(partVoice(id)).toBeUndefined();
		for (const other of ORDO.filter((item) => item.id !== 'catechumenorum'))
			expect(other.entries.some((entry) => entry.id === id)).toBe(false);
	}
});

it.each(['pl', 'en'] as const)(
	'loads both real complete %s bodies without changing their actors or voice',
	async (lang) => {
		const data = await ordoData(lang, 'catechumenorum');
		for (const [index, id] of ids.entries()) {
			const key = 'ordinarium/' + id;
			const body = await loadText(key, lang);
			expect(body, 'real canonical integration and fresh vendor are prerequisites').toBeDefined();
			if (!body) throw new Error('Ministerial body is absent');
			expect(data?.texts[key]?.doc).toEqual(body.text);
			expect(data?.texts[key]?.gloss).toEqual(body.gloss);
			expect(data?.texts[key]?.bibliography).toBeDefined();
			expect(
				body.text.segments.map((segment) => [segment.id, segment.words?.length, segment.speaker])
			).toEqual([
				['s01', 3, 'minister'],
				['s02', 16, 'sacerdos'],
				['s03', 8, 'sacerdos'],
				['s04', 1, index === 0 ? 'sacerdos' : 'minister']
			]);
			const words = body.text.segments.flatMap((segment) => segment.words ?? []);
			expect(words.map((word) => word.id)).toEqual(
				Array.from({ length: 28 }, (_, n) => 'w' + String(n + 1).padStart(3, '0'))
			);
			expect(words.map((word) => word.form + (word.post ?? '')).join(' ')).toBe(
				index === 0
					? 'Iube, domne, benedícere. Dóminus sit in corde tuo, et in lábiis tuis: ut digne et competénter annúnties evangélium suum: in nómine Patris, et Fílii, et Spíritus Sancti. Amen.'
					: 'Iube, domne, benedícere. Dóminus sit in córdibus vestris, et in lábiis vestris, ut digne et competénter annuntiétis Evangélium suum: in nómine Patris, et Fílii, et Spíritus Sancti. Amen.'
			);
			for (const segment of body.text.segments) {
				expect(segment.voice).toBeUndefined();
				expect(segment.delivery).toBeUndefined();
				expect(segment.participation).toBeUndefined();
				const alignments = body.gloss.segments[segment.id]?.alignments ?? [];
				for (const word of segment.words ?? []) {
					const direct = body.gloss.words[word.id]?.gloss ? 1 : 0;
					expect(
						direct + alignments.filter((group) => group.words.includes(word.id)).length,
						word.id
					).toBe(1);
				}
			}
		}
		for (const [id, counts] of [
			['munda-cor-meum', [29, 5]],
			['iube-domine-benedicere', [3, 16, 1]]
		] as const) {
			const body = await loadText('ordinarium/' + id, lang);
			expect(body?.text.segments.map((segment) => segment.words?.length)).toEqual(counts);
		}
	}
);

const pending: [string, Partial<GospelPreparationState>, readonly string[]][] = [
	['no date', { date: null }, [gospel]],
	['invalid date', { date: '2026-02-30' }, [gospel]],
	['loading with old keys', { loading: true }, [gospel]],
	['failed with old keys', { failed: true }, [gospel]],
	['unwritten', { unwritten: true }, [gospel]],
	['missing payload', { loadedMass: null, loadedLanguage: null }, [gospel]],
	['wrong Mass payload', { loadedMass: 'vigilia-paschalis' }, [gospel]],
	['opposite language payload', {}, [gospel]],
	['foreign date and Mass', { date: '2026-04-04' }, [gospel]],
	['unknown Mass', { mass: 'unknown', loadedMass: 'unknown' }, [gospel]],
	['no Gospel', {}, []],
	['two Gospels', {}, [gospel, passionKey]],
	['duplicate Gospel occurrence', {}, [gospel, gospel]],
	['empty identity', {}, ['']],
	['malformed identity', {}, ['not-a-key']],
	['real non-Gospel identity', {}, ['ordinarium/munda-cor-meum']],
	[
		'Ordinary alone loading',
		{ mass: null, loadedMass: null, loadedLanguage: null, loading: true },
		[]
	],
	['Ordinary alone stale payload', { mass: null }, [gospel]]
];
it.each(pending)('keeps both alternatives unconfirmed for %s', (name, patch, keys) => {
	for (const lang of ['pl', 'en'] as const) {
		const current = { ...state(lang), ...patch };
		if (name === 'opposite language payload') current.loadedLanguage = lang === 'pl' ? 'en' : 'pl';
		for (const id of ids) {
			const result = ordoMinisterBlessingContext(id, current, keys, lang)!;
			expect(result.referenceOnly).toBe(true);
			expect(result.note).toContain(
				lang === 'pl' ? 'Nie można jeszcze ustalić' : 'It is not yet clear'
			);
			expect(result.note).toContain(lang === 'pl' ? 'tylko do wglądu' : 'reference only');
		}
	}
});

const occasions = [
	['usual Gospel', ordinary, '2026-04-26', gospel, 'if one is present', 'does not apply here'],
	[
		'Palm Passion',
		passion,
		'2026-03-29',
		passionKey,
		'separate plural blessing',
		'qualified ministers, if present'
	],
	// A controlled context counterexample using a real other Gospel identity, not
	// a new payload fixture or a claim that the present Palm catalogue offers it.
	[
		'Palm with ordinary Gospel',
		passion,
		'2026-03-29',
		gospel,
		'if one is present',
		'does not apply here'
	],
	[
		'Easter Vigil',
		'vigilia-paschalis',
		'2026-04-04',
		'proprium/vigilia-paschalis-evangelium',
		'No lights are carried',
		'does not apply here'
	],
	[
		'Pentecost Vigil',
		'vigilia-pentecostes',
		'2026-05-23',
		'proprium/vigilia-pentecostes-evangelium',
		'if one is present',
		'does not apply here'
	],
	...[
		[
			'commemoratio-omnium-fidelium-defunctorum',
			'proprium/commemoratio-omnium-fidelium-defunctorum-missa-i-evangelium'
		],
		[
			'commemoratio-omnium-fidelium-defunctorum-missa-ii',
			'proprium/commemoratio-omnium-fidelium-defunctorum-missa-ii-evangelium'
		],
		[
			'commemoratio-omnium-fidelium-defunctorum-missa-iii',
			'proprium/commemoratio-omnium-fidelium-defunctorum-missa-iii-evangelium'
		]
	].map(([mass, key]) => [
		mass,
		mass,
		'2026-11-02',
		key,
		'request and blessing are omitted',
		'request and blessing are omitted'
	])
];
it.each(occasions)(
	'describes %s without declaring actual ministers present',
	(_, mass, date, key, ordinaryNote, palmNote) => {
		expect(resolveOrdoChoice(date, mass)).toEqual({ date, mass });
		expect(hasText(key), 'the counterexample still names a real Gospel').toBe(true);
		for (const lang of ['pl', 'en'] as const)
			for (const [index, id] of ids.entries()) {
				const result = ordoMinisterBlessingContext(id, state(lang, mass, date), [key], lang)!;
				expect(result.referenceOnly).toBe(true);
				expect(result.note).toContain(lang === 'pl' ? 'tylko do wglądu' : 'reference only');
				expect(result.note).not.toContain(';');
				if (lang === 'en') expect(result.note).toContain(index === 0 ? ordinaryNote : palmNote);
			}
	}
);

it.each(['pl', 'en'] as const)(
	'retains the conditional complete Ordinary without a selected Mass in %s',
	(lang) => {
		for (const id of ids) {
			const result = ordoMinisterBlessingContext(id, state(lang, null), [], lang)!;
			expect(result.referenceOnly).toBe(true);
			expect(result.note).toContain(
				lang === 'pl' ? 'bez wybranego formularza' : 'without a selected formulary'
			);
		}
		expect(
			ordoBlessingContext('iube-domine-benedicere', state(lang, null), lang)?.referenceOnly
		).toBe(false);
	}
);

it('leaves every other entry to its existing context helper', () => {
	for (const entry of ORDO.flatMap((item) => item.entries)) {
		if (ids.some((id) => id === entry.id)) continue;
		expect(ordoMinisterBlessingContext(entry.id, state('en'), [gospel], 'en')).toBeUndefined();
	}
});

it.each(['pl', 'en'] as const)(
	'keeps explicit actors and source-literal voice guidance in %s',
	(lang) => {
		const notes = ids.map((id) =>
			movement.entries.find((entry) => entry.id === id)!.note[lang].replaceAll('\u00a0', ' ')
		);
		for (const note of notes) {
			expect(note).not.toContain(
				lang === 'pl' ? 'Wspólna konstrukcja zdania' : 'sentence construction'
			);
			expect(note).not.toContain(';');
		}
		expect(notes[0]).toContain(
			lang === 'pl' ? 'sam mówi końcowe Amen' : 'says the final Amen himself'
		);
		expect(notes[0]).toContain(
			lang === 'pl' ? 'Prośbę wypowiada diakon' : 'The deacon makes the request'
		);
		expect(notes[0]).toContain(
			lang === 'pl'
				? 'Nie odmawia się tej formuły po przygotowaniu kapłana'
				: 'not said after the preparation of the priest'
		);
		for (const phrase of lang === 'pl'
			? [
					'co najmniej święcenia diakonatu',
					'Ci duchowni odpowiadają Amen',
					'głosem umiarkowanym (media voce)',
					'kapłana wykonującego Pasję sam',
					'obrzędach palm przed Mszą'
				]
			: [
					'at least deacons',
					'Those ministers answer Amen',
					'in a moderate voice (media voce)',
					'priest delivering the Passion alone',
					'palm ceremonies before Mass'
				])
			expect(notes[1]).toContain(phrase);
	}
);

const profiles = (['pl', 'en'] as const).flatMap((lang) =>
	(['lecta', 'cantu'] as const).flatMap((form) =>
		ROLES.flatMap((who) => [0, 1, 2].map((helpLevel) => ({ lang, form, who, helpLevel })))
	)
);
it.each(profiles)(
	'renders both full references without active cues in $lang/$form/$who/help$helpLevel',
	async ({ lang, form, who, helpLevel }) => {
		const beforeForm = massForm.value,
			beforeRole = role.value;
		try {
			massForm.set(form);
			role.set(who);
			for (const id of ids) {
				const body = await loadText('ordinarium/' + id, lang);
				expect(body).toBeDefined();
				if (!body) throw new Error('Real ministerial body is absent');
				const before = structuredClone(body);
				const context = ordoMinisterBlessingContext(id, state(lang), [gospel], lang)!;
				const props = {
					doc: body.text,
					gloss: body.gloss,
					lang,
					helpLevel,
					idPrefix: id,
					ontap: () => {}
				};
				const active = render(TextBody, { props }).body;
				const reference = render(TextBody, {
					props: { ...props, referenceOnly: context.referenceOnly }
				}).body;
				expect(active).toContain('who-name');
				for (const cue of [
					'class="who',
					'who-name',
					'who-all',
					'who-join',
					'who-voice',
					'class="mark'
				])
					expect(reference).not.toContain(cue);
				const flow = flowBinding(
					body.text,
					body.gloss,
					{ helpLevel, referenceOnly: context.referenceOnly },
					form,
					who
				);
				expect(flow.sharedPrayer).toBe(false);
				for (const [index, segment] of body.text.segments.entries()) {
					expect(flow.options.namesWho(index)).toBe(false);
					expect(flow.options.response(index)).toBe(false);
					const opening = reference.match(
						new RegExp('<p[^>]*id="' + id + '-' + segment.id + '"[^>]*>')
					)?.[0];
					expect(opening).toBeDefined();
					const classes = opening!.match(/class="([^"]*)"/)![1].split(/\s+/);
					for (const cue of ['quiet', 'answer', 'marked']) expect(classes).not.toContain(cue);
					expectParagraphLatin(reference, id + '-' + segment.id, segment.words!);
					for (const word of segment.words!)
						expect(reference.split('id="' + id + '.' + word.id + '"')).toHaveLength(2);
				}
				for (const opened of [false, true])
					expect(ordoEntryVisibility(context.referenceOnly, false, opened)).toEqual({
						words: true,
						silent: false,
						folded: false,
						revealed: false
					});
				expect(body).toEqual(before);
			}
		} finally {
			massForm.set(beforeForm);
			role.set(beforeRole);
		}
	}
);

it('wires current payload Gospel keys and actor guidance into the shared reference path', () => {
	const route = readFileSync('src/routes/app/[lang=lang]/ordo/[movement]/+page.svelte', 'utf8');
	for (const fragment of [
		'proper.payload?.day === proper.day',
		'proper.payload?.lang === lang',
		"proper.forSlot('evangelium').map((part) => part.key)",
		"ministerial.note + ' ' + entry.note[lang]",
		'{ helpLevel, referenceOnly }'
	])
		expect(route).toContain(fragment);
	expect(route).toMatch(
		/ordoMinisterBlessingContext\(\s*entry\.id,\s*applicabilityState,\s*settledGospelKeys,\s*lang\s*\)/
	);
	expect(route.match(/\{referenceOnly\}/g)).toHaveLength(2);
	// Wiring guard only. Real route lifecycle, browser and print remain separate gates.
});
