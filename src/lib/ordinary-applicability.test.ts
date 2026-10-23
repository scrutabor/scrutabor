import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { render } from 'svelte/server';
import TextBody from './components/TextBody.svelte';
import { loadText } from './corpus';
import { ordinaryApplicability } from './ordinary-applicability';
import { ordoEntryVisibility, type GospelPreparationState } from './ordo-context';
import { resolveOrdoChoice } from './ordo-choice';
import { ORDO } from './ordo';
import { flowBinding } from './reading-flow';
import { massForm } from './mass-form.svelte';
import { role, ROLES } from './role.svelte';
import { expectParagraphLatin } from './ordo-test-context';
import { findOrphans } from './polish';

const settled = (date: string, mass: string | null, lang: 'pl' | 'en'): GospelPreparationState => ({
	date,
	mass,
	loadedMass: mass,
	loadedLanguage: mass ? lang : null,
	loading: false,
	failed: false,
	unwritten: false
});
const actual = [
	['2026-11-29', 'dominica-i-adventus', 'omitted', 'required'],
	['2026-04-26', 'dominica-iii-post-pascha', 'required', 'required'],
	['2026-03-29', 'dominica-ii-passionis', 'omitted', 'required'],
	['2026-04-02', 'feria-v-in-cena-domini', 'required', 'omitted'],
	['2026-04-04', 'vigilia-paschalis', 'required', 'omitted'],
	['2026-05-23', 'vigilia-pentecostes', 'required', 'omitted'],
	['2026-11-02', 'commemoratio-omnium-fidelium-defunctorum', 'omitted', 'omitted'],
	['2026-11-02', 'commemoratio-omnium-fidelium-defunctorum-missa-ii', 'omitted', 'omitted'],
	['2026-11-02', 'commemoratio-omnium-fidelium-defunctorum-missa-iii', 'omitted', 'omitted'],
	['2025-12-24', 'vigilia-nativitatis', 'omitted', 'omitted'],
	['2028-12-24', 'vigilia-nativitatis', 'omitted', 'required'],
	['2027-07-26', 'sanctae-annae-matris-beatae-mariae-virginis', 'required', 'omitted'],
	['2027-08-16', 'sancti-ioachim-confessoris', 'required', 'omitted'],
	['2026-08-10', 'sancti-laurentii-martyris', 'required', 'omitted'],
	['2029-12-30', 'dominica-infra-octavam-nativitatis', 'required', 'required'],
	['2026-11-09', 'dedicatio-archibasilicae-sanctissimi-salvatoris', 'required', 'required'],
	['2026-01-11', 'sancta-familia', 'required', 'required']
] as const;

it.each(actual)('uses only the owned settled branches at %s/%s', (date, mass, gloria, credo) => {
	expect(resolveOrdoChoice(date, mass)).toEqual({ date, mass });
	for (const lang of ['pl', 'en'] as const)
		for (const [entry, expected] of [
			['gloria', gloria],
			['credo', credo]
		] as const) {
			const result = ordinaryApplicability(entry, settled(date, mass, lang), lang)!;
			expect(result.applicability).toBe(expected);
			expect(result.referenceOnly).toBe(expected !== 'required');
			if (lang === 'pl') expect(findOrphans(result.note ?? '')).toEqual([]);
			else expect(result.note ?? '').not.toContain('\u00a0');
			if (expected === 'omitted') {
				expect(result.note).toContain(lang === 'pl' ? 'wglądu' : 'reference only');
				expect(result.note).not.toContain(';');
			}
		}
});

const unsettled: [string, Partial<GospelPreparationState>][] = [
	['initial', { date: null, mass: null, loadedMass: null, loadedLanguage: null }],
	['invalid date', { date: '2026-02-30' }],
	['loading', { loading: true }],
	['failure', { failed: true }],
	['unwritten', { unwritten: true }],
	['missing payload', { loadedMass: null, loadedLanguage: null }],
	['stale Mass', { loadedMass: 'vigilia-paschalis' }],
	['stale language', {}],
	['foreign date', { date: '2026-04-04' }],
	['unknown Mass', { mass: 'unknown', loadedMass: 'unknown' }],
	['no date', { date: null }]
];
it.each(unsettled)('retains conditional reference words for %s', (name, patch) => {
	for (const lang of ['pl', 'en'] as const)
		for (const entry of ['gloria', 'credo']) {
			const pending = { ...settled('2026-04-26', 'dominica-iii-post-pascha', lang), ...patch };
			if (name === 'stale language') pending.loadedLanguage = lang === 'pl' ? 'en' : 'pl';
			const result = ordinaryApplicability(entry, pending, lang)!;
			expect(result.applicability).toBe('unresolved');
			expect(result.referenceOnly).toBe(true);
			expect(result.note).toContain(lang === 'pl' ? 'wglądu' : 'reference only');
			if (lang === 'pl') expect(findOrphans(result.note ?? '')).toEqual([]);
			else expect(result.note ?? '').not.toContain('\u00a0');
		}
});

it('does not fabricate an occurrence for either catalogue-only Sunday form', () => {
	for (const mass of [
		'dominica-i-post-epiphaniam',
		'dominica-iii-quae-superfuit-post-epiphaniam'
	]) {
		const date = '2026-04-26';
		expect(resolveOrdoChoice(date, mass)).toBeNull();
		for (const entry of ['gloria', 'credo'])
			expect(ordinaryApplicability(entry, settled(date, mass, 'en'), 'en')?.referenceOnly).toBe(
				true
			);
	}
});

it('keeps explicit Ordinary-alone conditional and leaves all other entries to their own helpers', () => {
	for (const lang of ['pl', 'en'] as const) {
		for (const entry of ['gloria', 'credo']) {
			const result = ordinaryApplicability(entry, settled('2026-04-26', null, lang), lang)!;
			expect(result.applicability).toBe('unresolved');
			expect(result.referenceOnly).toBe(true);
			expect(result.note).toContain(lang === 'pl' ? 'Nie wybrano formularza' : 'No Mass formulary');
		}
		for (const entry of ORDO.flatMap((movement) => movement.entries)) {
			if (entry.id === 'gloria' || entry.id === 'credo') continue;
			expect(
				ordinaryApplicability(entry.id, settled('2026-04-26', null, lang), lang)
			).toBeUndefined();
		}
	}
});

it.each(['gloria', 'credo'] as const)(
	'retains complete %s reference content across forms, roles and help',
	async (part) => {
		for (const lang of ['pl', 'en'] as const) {
			const body = await loadText('ordinarium/' + part, lang);
			expect(body, 'a genuine fresh vendor is required').toBeDefined();
			if (!body) throw new Error('Conditional Ordinary body is absent');
			const saved = structuredClone(body);
			for (const form of ['lecta', 'cantu'] as const)
				for (const who of ROLES)
					for (const helpLevel of [0, 1, 2]) {
						const ref = flowBinding(
							body.text,
							body.gloss,
							{ helpLevel, referenceOnly: true },
							form,
							who
						);
						expect(ref.sharedPrayer).toBe(false);
						expect(ref.segs.some((_, i) => ref.options.namesWho(i))).toBe(false);
						expect(ref.segs.some((_, i) => ref.options.response(i))).toBe(false);
						for (const opened of [false, true])
							expect(ordoEntryVisibility(true, false, opened)).toEqual({
								words: true,
								silent: false,
								folded: false,
								revealed: false
							});
					}
			const beforeForm = massForm.value,
				beforeRole = role.value;
			try {
				massForm.set('cantu');
				role.set('populus');
				for (const helpLevel of [0, 1, 2]) {
					const props = {
						doc: body.text,
						gloss: body.gloss,
						lang,
						helpLevel,
						idPrefix: 'conditional',
						ontap: () => {}
					};
					const active = render(TextBody, { props }).body;
					const reference = render(TextBody, { props: { ...props, referenceOnly: true } }).body;
					expect(active).toContain('who-name');
					for (const cue of ['who-name', 'who-all', 'who-join', 'who-voice', 'class="mark'])
						expect(reference).not.toContain(cue);
					for (const segment of body.text.segments.filter((item) => item.type === 'verse')) {
						const opening = reference.match(
							new RegExp('<p[^>]*id="conditional-' + segment.id + '"[^>]*>')
						)?.[0];
						expect(opening).toBeDefined();
						for (const cue of ['yours', 'quiet', 'answer'])
							expect(opening).not.toMatch(new RegExp('\\b' + cue + '\\b'));
						expectParagraphLatin(reference, 'conditional-' + segment.id, segment.words!);
						for (const word of segment.words!) {
							const token = 'id="conditional.' + word.id + '"';
							expect(active.split(token)).toHaveLength(2);
							expect(reference.split(token)).toHaveLength(2);
						}
					}
				}
			} finally {
				massForm.set(beforeForm);
				role.set(beforeRole);
			}
			expect(body).toEqual(saved);
		}
	}
);

it('passes the same settled context and reference state to screen flow and both print bodies', () => {
	const route = readFileSync('src/routes/app/[lang=lang]/ordo/[movement]/+page.svelte', 'utf8');
	expect(route).toContain('ordinaryApplicability(entry.id, applicabilityState, lang)');
	for (const field of [
		'date: proper.date',
		'mass: proper.day',
		'loadedMass: proper.payload?.day',
		'loadedLanguage: proper.payload?.lang',
		'loading: proper.loading',
		'failed: proper.failed',
		'unwritten: proper.unwritten'
	])
		expect(route).toContain(field);
	expect(route.match(/\{referenceOnly\}/g)).toHaveLength(2);
	expect(route).toContain('{ helpLevel, referenceOnly }');
});
